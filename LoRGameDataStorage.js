// Import fetch to make async requests
const fetch = require('node-fetch');
// Import fs to write files on disk
const fs = require('fs');

let directory;
let previousCardPositions = "None";
trackGameState();

// Recursive function
function trackGameState() {
    isPlayerInGame().then(isPlayerInGame => {
        if (!isPlayerInGame) {
            wait(1500);
            trackGameState();
        } else {
            trackGame();
        }
    })
}

function trackGame() {
    getDeck().then(deckAsJson => {
        // Checks if there is an active deck
        if(deckAsJson.DeckCode != null && JSON.stringify(deckAsJson.CardsInDeck) !== "{}") {

            // Uses current date and time to generate a folder under the "Tracked Data" directory
            generateUniqueFolder();

            // Stores current deck inside the unique folder
            storeDeck(deckAsJson);

            // If game is active then keep storing data with storeData recursive function
            storeData();

        }
        // If there is no active deck, relaunch trackGame after 5seconds
        else {
            wait(1500);
            log("No active deck found, relaunching tracker...");
            trackGame();
        }
    });
}

function storeDeck(deckAsJson) {
    log('Called static-decklist and returned ' + JSON.stringify(deckAsJson));
    createFileAndWrite('deck', JSON.stringify(deckAsJson));
}

async function getDeck() {
    return await getLoRData('static-decklist');
}

function storeData() {
    isPlayerInGame().then(isPlayerInGame => {
        if(isPlayerInGame){

            // Stores Card Positions every 2 seconds if positions changed
            createDirectory(directory + '/Card Positions');
            getCardPositions().then( json => {
                const today = new Date();
                const cardPositionsAsString = JSON.stringify(json);

                if(cardPositionsAsString !== undefined && cardPositionsAsString !== previousCardPositions) {
                    createFileAndWrite('Card Positions/'+ getTime(today), cardPositionsAsString);
                    previousCardPositions = cardPositionsAsString;
                }
            });

            wait(2000);
            storeData();
        } else {
            log("Game has ended !");
            getGameResult().then( json => {
                createFileAndWrite('Game Result', JSON.stringify(json));
            });
            trackGameState();
        }
    });
}

async function isPlayerInGame() {
    const json = await getCardPositions();

    // Checks if there is an active deck
    if (json.GameState !== "InProgress") {
        log("Player is not in game");
        return false;
    } else {
        log("Game in progress");
        return true;
    }
}

async function getCardPositions() {
    const cardPositionsAsJson = await getLoRData('positional-rectangles');
    const cardPositionsAsString = JSON.stringify(cardPositionsAsJson);
    if (cardPositionsAsString !== previousCardPositions) {
        log('Called positional-rectangles and returned ' + cardPositionsAsString);
    }
    return cardPositionsAsJson;
}

async function getGameResult() {
    const gameResultAsJson = await getLoRData('game-result');
    log('Called game-result and returned ' + JSON.stringify(gameResultAsJson));
    return gameResultAsJson;
}

async function getLoRData(endpoint) {
    // Base url to target Legends of Runeterra local game
    let baseUrl = 'http://127.0.0.1:21337/';
    baseUrl += endpoint;
    try {
        const response = await fetch(baseUrl);
        const json = await response.json();
        log('Called endpoint ' + endpoint);
        return json
    } catch (error) {
        log(error);
    }
}

function createFileAndAppend(filePath, content) {
    fs.appendFile(filePath, content, function (error) { if (error) { log(error); throw error;  } });
}

function createFileAndWrite(fileName, content) {
    fs.writeFile(directory + '/'+ fileName, content, function (error) {
        if (error) throw error;
    });
}

function generateUniqueFolder() {
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const time = getTime(today);
    directory = 'Tracked Data/' + date + '-' + time;
    createDirectory(directory)
}

function getTime(today) {
    return today.getHours() + "-" + today.getMinutes() + "-" + today.getSeconds();
}

function createDirectory(path) {
    fs.mkdirSync(path, { recursive: true })
}

function wait(ms) {
    const start = new Date().getTime();
    let end = start;
    while(end < start + ms) {
        end = new Date().getTime();
    }
}

function log(message) {
    const today = new Date();
    const log = getTime(today) + ' ' + message;
    console.log(log);
    createFileAndAppend('logs.txt', '\n' + log);
}