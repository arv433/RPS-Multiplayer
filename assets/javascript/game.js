// Initialize Firebase and Database
var config = {
    apiKey: "AIzaSyARxPfdsxNMKCUSuJuzI628MMRRPix89HE",
    authDomain: "rock-paper-scissors-7e555.firebaseapp.com",
    databaseURL: "https://rock-paper-scissors-7e555.firebaseio.com",
    projectId: "rock-paper-scissors-7e555",
    storageBucket: "rock-paper-scissors-7e555.appspot.com",
    messagingSenderId: "3753288461"
};

firebase.initializeApp(config);

// Assign firebase database to variable
var database = firebase.database();

// create connection state branch
var connectedRef = database.ref(".info/connected");

// create connections branch that shows connections list
var connectionsRef = database.ref("/connections");

// create the current state of the game between two players
var gameStateRef = database.ref("/gameState");

// player1's variables within gameStateRef
var player1Ref = database.ref("/gameState/Player1");
var player1SpotRef = database.ref("/gameState/Player1/spotOpen");
var player1StageRef = database.ref("/gameState/Player1/stage");

// player2's variables within gameStateRef
var player2Ref = database.ref("/gameState/Player2");
var player2SpotRef = database.ref("/gameState/Player2/spotOpen");
var player2StageRef = database.ref("/gameState/Player2/stage");

// Backend variable that signals both players that matchmaking is complete and the game is ready to begin
var gameReadyRef = database.ref("/gameState/ready")

// create player variable which will be assigned a number
var playerNumber;

// Client's assignment of Firebase references
var sessionSpot;
var sessionStage;

// Opponent's assignment of Firebase references
var opponentSpot;
var opponentStage;

// Variable to check if the retry button is already in place
var retryScreen;

// Variable to check if the game is ready to progress after match making
var gameReady = false;

// Variable to select Rock (1), Paper (2), Scissors (3), or no selection (-1)
// This variable is updated to the database
var selection = -1;

// this variable signifies whether if the "waiting for opponent's choice message" shows
var roundOver;

// Wins, losses, and ties with opponent in current session
var wins = 0;
var losses = 0;
var ties = 0;

// this variable checks if audio is playing
var music = document.getElementById("gameplaySong");
var audioPlaying = false;

// recursive function that animates the log text by changing the number of dots it is followed by
// Each nested change of text is executed if the game is not ready so that the animation can cancel at any point in the cycle
function waitAnimation() {
    if (!(gameReady)) {
        $(".gameBtn").fadeOut();
        $("#winsLosses").fadeOut();
        $("#log").empty();
        $("#log").fadeIn();
        $("#log").text("Waiting for opponent");
        if (!(gameReady)) {
            setTimeout(function () {
                $("#log").text("Waiting for opponent.");
                if (!(gameReady)) {
                    setTimeout(function () {
                        $("#log").text("Waiting for opponent..");
                        if (!(gameReady)) {
                            setTimeout(function () {
                                $("#log").text("Waiting for opponent...")
                                if (!(gameReady)) {
                                    setTimeout(function () {
                                        waitAnimation();
                                    }, 0.75 * 1000);
                                } else {
                                    $("#log").empty();
                                };
                            }, 0.25 * 1000);
                        } else {
                            $("#log").empty();
                        };
                    }, 0.25 * 1000);
                } else {
                    $("#log").empty();
                };
            }, 0.25 * 1000);
        }
    } else {
        $("#log").empty();
    };
};

// assignPlayer() checks the availability of the player 1 spot, and assigns the players to it if it is open
/* if it is not, then the player 2 spot is checked. if that is not available either, the player is told that there
is no room and they are given a retry button to click on whenever a spot opens up */
function assignPlayer() {
    player1SpotRef.once("value").then(function (p1SpotSnapshot) {
        if (p1SpotSnapshot.val()) {
            player1SpotRef.set(false);
            playerNumber = 1;
            // P1 assignment of databse refs to self
            sessionSpot = player1SpotRef;
            sessionSpot.onDisconnect().set(true);
            sessionStage = player1StageRef;
            // P1 assignment of database refs to opponent
            opponentSpot = player2SpotRef;
            opponentStage = player2StageRef;
            resetGame();
            waitForOpponent();
            if (retryScreen) {
                $("#retryBtn").remove();
                $("#log").fadeOut();
            };
        } else {
            player2SpotRef.once("value").then(function (p2SpotSnapshot) {
                if (p2SpotSnapshot.val()) {
                    player2SpotRef.set(false);
                    playerNumber = 2;
                    // P2 assignment of database refs to self
                    sessionSpot = player2SpotRef;
                    sessionSpot.onDisconnect().set(true);
                    sessionStage = player2StageRef;
                    // P2 assignment of database refs to opponent
                    opponentSpot = player1SpotRef;
                    opponentStage = player1StageRef;
                    resetGame();
                    waitForOpponent();
                    if (retryScreen) {
                        $("#retryBtn").remove();
                        $("#log").fadeOut();
                    };
                } else {
                    $("#log").text("Sorry, there are currently two active players. Wait for a player to leave, then retry.", 5);
                    if (!(retryScreen)) {
                        $(document.body).append($("<button id='retryBtn' onclick='assignPlayer()'>Retry</button>"));
                        retryScreen = true;
                    };
                };
            });
        };
    });
};

// brieflyLogText is a function concerning visuals that makes a given text appear, in a given spot, and fades out after a given amount of seconds
function brieflyLogText(text, seconds, where) {
    where.show();
    where.text(text);
    setTimeout(function () {
        if (!(roundOver)) {
            where.fadeOut();
        };
    }, seconds * 1000);
};

// resetGame() resets the game and is called whenever an active player disconnects
function resetGame() {
    $("#log").fadeOut();
    $("#log").empty();
    $("#oppLog").fadeOut();
    $("#oppLog").empty();
    // P1
    player1StageRef.set(-1);
    // P2
    player2StageRef.set(-1);
    // Your choice
    selection = -1;
    opponentPick = -1;
};

// the game is initialized when two players are present
function initializeGame() {
    $("#winsLosses").html("Wins: 0 &emsp; Losses: 0 &emsp; Ties: 0");
    $("#winsLosses").fadeIn();
    // the inner pick function creates the selection stage of the game
    function pick() {
        roundOver = false;
        $(".gameBtn").fadeIn();
        opponentStage.on("value", function (snapshot) {
            if (snapshot.val() >= 0) {
                if (selection < 0) {
                    brieflyLogText("Opponent has made a selection", 1.5, $("#oppLog"));
                } else {
                    if (!(roundOver)) {
                        evaluateResult(snapshot.val());
                    };
                };
            };
        });

        // pick() binds click handler to buttons
        $(".gameBtn").bind("click", function () {
            $(".gameBtn").unbind("click");
            if (!(audioPlaying)) {
                music.play();
                audioPlaying = true;
            }
            selection = $(this).attr("stage-value");
            animateButtons(selection);
            sessionStage.set(selection);
            // if the opponent has already selected, the evaluation stage begins right away
            opponentStage.once("value").then(function (snapshot) {
                if (snapshot.val() >= 0) {
                    if (!(roundOver)) {
                        evaluateResult(snapshot.val());
                    }
                };
            });
        });
    }

    // when selected during the pick phase of the game, the other buttons fade and the chosen button moves to the vertical middle of the screen
    function animateButtons(choice) {
        switch (parseInt(choice)) {
            case 1:
                $(".rockBtn").parent().position({
                    my: "center",
                    at: "center",
                    of: window,
                    using: function (pos, ext) {
                        $(this).animate({ top: pos.top }, 600);
                    }
                });
                $(".paperBtn").fadeOut();
                $(".scissorsBtn").fadeOut();
                waitForOppChoice();
                break;
            case 2:
                $(".rockBtn").fadeOut();
                $(".paperBtn").parent().position({
                    my: "center",
                    at: "center",
                    of: window,
                    using: function (pos, ext) {
                        $(this).animate({ top: pos.top }, 600);
                    }
                });
                $(".scissorsBtn").fadeOut();
                waitForOppChoice();
                break;
            case 3:
                $(".rockBtn").fadeOut();
                $(".paperBtn").fadeOut();
                $(".scissorsBtn").parent().position({
                    my: "center",
                    at: "center",
                    of: window,
                    using: function (pos, ext) {
                        $(this).animate({ top: pos.top }, 600);
                    }
                });
                waitForOppChoice();
                break;
        };
    };

    // if the opponent has not chosen yet, the right side of the screen will log that they are still choosing
    function waitForOppChoice() {
        if (!(roundOver)) {
            brieflyLogText("Opponent is choosing...", 1.5, $("#oppLog"));
        } else {
            $("#oppLog").empty();
        }
    };

    /* this function populates the right side of the screen with an image of the opponent's pick,
    then calculates the scenarios that would result in a user's win, loss, or tie */
    function evaluateResult(opponentPick) {
        roundOver = true;
        $("#oppLog").empty();
        $("#oppLog").text("");
        $("#oppLog").css("display", "none");
        // dynamically display images
        switch (opponentPick) {
            case "1":
                var img = $("<img src='assets/images/rock.png' class='oppImg rockBtn'>");
                $("#oppLog").html(img);
                break;
            case "2":
                var img = $("<img src='assets/images/paper.png' class='oppImg oppPaper'>");
                $("#oppLog").html(img);
                break;
            case "3":
                var img = $("<img src='assets/images/scissors.png' class='oppImg'>");
                $("#oppLog").html(img);
                break;
        }
        $("#oppLog").css("display", "show");

        // if the selections are the for both players, immediately calculate a tie
        if (selection == opponentPick) {
            tie();
        // otherwise, compare the two selections and conclude a winning or losing scenario
        } else {
            switch (parseInt(selection)) {
                case 1:
                    if (opponentPick == 2) {
                        lose();
                    } else if (opponentPick == 3) {
                        win();
                    }
                    break;
                case 2:
                    if (opponentPick == 1) {
                        win();
                    } else if (opponentPick == 3) {
                        lose();
                    }
                    break;
                case 3:
                    if (opponentPick == 1) {
                        lose();
                    } else if (opponentPick == 2) {
                        win();
                    }
                    break;
                default:
            };
        };
    };

    // the following three functions are nearly identical and increase the amount of wins, losses, or ties for each player according to the result
    function win() {
        $("#oppLog").fadeIn();
        wins++;
        resetRound();
    };

    function lose() {
        $("#oppLog").fadeIn();
        losses++;
        resetRound();
    };

    function tie() {
        $("#oppLog").fadeIn();
        ties++;
        resetRound();
    };

    // this function updates the winsLosses div and resets the selections on both the back end and the frontend
    function resetRound() {
        $("#winsLosses").html("Wins: " + wins + "&emsp; Losses: " + losses + "&emsp; Ties: " + ties);
        player1StageRef.set(-1);
        player2StageRef.set(-1);
        selection = -1;
        opponentPick = -1;
        // after five seconds, the visuals are reset and brought back to the pick phase
        setTimeout(function () {
            $("#oppLog").text("");
            $("#oppImg").fadeOut();
            console.log("removing image")
            pick();
        }, 5 * 1000)
    }

    // this is the inital function of initialize game
    if (playerNumber) {
        pick();
    };
};

// this function waits for the status of the opponent's spot to change after the user has been assigned a player number
function waitForOpponent() {
    opponentSpot.on("value", function (oppSpotSnap) {
        if (!(oppSpotSnap.val())) {
            gameReadyRef.set(true);
            gameReadyRef.onDisconnect().set(false);
        };
    });
};

// when the connection state of individual user changes from false to true or true to false...
connectedRef.on("value", function (snapshot) {
    // if the clients connection has a value of true...
    if (snapshot.val()) {
        // add a 'true' to the connections branch
        var con = connectionsRef.push(true);
        con.onDisconnect().remove();
    };
});

// when the list of connections change under the 'connections' branch...
connectionsRef.on("value", function (connectionChange) {
    gameReadyRef.once("value").then(function (gameReadySnap) {
        if (!(gameReadySnap.val())) {
            waitAnimation();
        };
    });
});

// this database ref handler checks and modifies the gameReady ref and immediately starts or resets the game based on its value
gameReadyRef.on("value", function (readySnap) {
    gameReady = readySnap.val();
    if (gameReady) {
        initializeGame();
    } else {
        resetGame();
        if (playerNumber) {
            waitAnimation();
        };
    };
});

// inital function when the document is loaded
if (!(playerNumber)) {
    assignPlayer();
};