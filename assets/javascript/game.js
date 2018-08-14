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
var player1WinsRef = database.ref("/gameState/Player1/wins");

// player2's variables within gameStateRef
var player2Ref = database.ref("/gameState/Player2");
var player2SpotRef = database.ref("/gameState/Player2/spotOpen");
var player2StageRef = database.ref("/gameState/Player2/stage");
var player2WinsRef = database.ref("/gameState/Player2/wins");

var tiesRef = database.ref("/gameState/ties");

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

// this variable signifies whether if the "waiting for opponenet's choice message" shows
var roundOver;

// Wins, losses, and ties with opponent in current session
var wins = 0;
var losses = 0;
var ties = 0;

function waitAnimation() {
    if (!(gameReady)) {
        $(".gameBtn").fadeOut();
        $("#log").fadeIn()
        $("#log").text("Waiting for opponent.");
        setTimeout(function () {
            $("#log").text("Waiting for opponent..");
            setTimeout(function () {
                $("#log").text("Waiting for opponent...")
                setTimeout(function () {
                    waitAnimation();
                }, 0.75 * 1000);
            }, 0.25 * 1000);
        }, 0.25 * 1000);
    } else {
        $("#log").empty();
    };
};

function assignPlayer() {
    player1SpotRef.once("value").then(function (p1SpotSnapshot) {
        if (p1SpotSnapshot.val()) {
            console.log("P1 Spot is open, now setting as closed")
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
            console.log("calling wait for opponent");
            waitForOpponent();
            console.log("Your player number is " + playerNumber);
            if (retryScreen) {
                $("#retryBtn").remove();
            };
        } else {
            player2SpotRef.once("value").then(function (p2SpotSnapshot) {
                if (p2SpotSnapshot.val()) {
                    console.log("P1 Spot is closed, P2 spot is open, now setting as closed")
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
                    console.log("calling wait for opponent");
                    waitForOpponent();
                    console.log("Your player number is " + playerNumber);
                    if (retryScreen) {
                        $("#retryBtn").remove();
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

function brieflyLogText(text, seconds) {
    $("#log").show();
    $("#log").text(text);
    setTimeout(function () {
        $("#log").fadeOut();
    }, seconds * 1000);
};

function resetGame() {
    console.log("Game reset")
    // P1
    player1StageRef.set(-1);
    player1WinsRef.set(0);
    // P2
    player2StageRef.set(-1);
    player2WinsRef.set(0);
    // Your choice
    selection = -1;
}

function initializeGame() {
    console.log("Game initialized");
    function pick() {
        roundOver = false;
        console.log("fading in buttons...")
        $(".gameBtn").fadeIn();
        opponentStage.on("value", function (snapshot) {
            if (snapshot.val() >= 0) {
                if (selection < 0) {
                    console.log("my selection is less than 0 and opponent has made a selection")
                    brieflyLogText("Opponent has made a selection.", 3);
                } else {
                    evaluateResult(snapshot.val());
                };
            };
        });

        $(".gameBtn").bind("click", function () {
            $(".gameBtn").unbind("click");
            selection = $(this).attr("stage-value");
            animateButtons(selection);
            sessionStage.set(selection);
            opponentStage.once("value").then(function (snapshot) {
                if (snapshot.val() >= 0) {
                    evaluateResult(snapshot.val());
                };
            });
        });
    }

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

    function waitForOppChoice() {
        if (!(roundOver)) {
            $("#oppLog").text("Opponent is choosing...");
        };
    };

    function evaluateResult(opponentPick) {
        roundOver = true;
        $("#oppLog").fadeOut()
        $("#oppLog").empty()
        switch (opponentPick) {
            case "1":
                $("#oppLog").html("<img src='assets/images/rock.png' class='oppImg rockBtn'>");
                break;
            case "2":
                $("#oppLog").html("<img src='assets/images/paper.png' class='oppImg paperBtn'>");
                break;
            case "3":
                $("#oppLog").html("<img src='assets/images/scissors.png' class='oppImg'>")
                break;
        }
        $("#oppLog").fadeIn()
        console.log(opponentPick);
        if (selection == opponentPick) {
            console.log("Your selection is the same is the opponents")
            tie();
        } else {
            console.log("else statement called");
            console.log("my selection is " + selection)
            console.log("type of selection is ")
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
                    console.log("Could not compare your selection and opponent's selection");
            };
        };
    };

    function win() {
        console.log("you won!")
        wins++;
    }

    function lose() {
        console.log("You lost.")
        losses++;
    }

    function tie() {
        console.log("You and your opponent have tied.")
        ties++;
    }
    if (playerNumber) {
        pick();
    }
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
    console.log("connectionRef changed");
    gameReadyRef.once("value").then(function (gameReadySnap) {
        if (!(gameReadySnap.val())) {
            waitAnimation();
        }
    })
    console.log("gameReady: " + gameReady);
    /* if (playerNumber) {
        opponentSpot.on("value", function (snapshot) {
            if (!(snapshot.val())) {
                if (!(gameReady)) {
                    initializeGame();
                    gameReady = true;
                };
            } else {
                waitAnimation();
            };
        });
    }; */
});

function waitForOpponent() {
    opponentSpot.on("value", function (oppSpotSnap) {
        console.log("opponent's spot ref has changed")
        if (!(oppSpotSnap.val())) {
            console.log("setting gameReadyRef as true")
            gameReadyRef.set(true);
            gameReadyRef.onDisconnect().set(false);
        };
    });
};

gameReadyRef.on("value", function (readySnap) {
    console.log("found change in gameReadyRef")
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

if (!(playerNumber)) {
    console.log("This session does not have a player number, now assigning...")
    assignPlayer();
};