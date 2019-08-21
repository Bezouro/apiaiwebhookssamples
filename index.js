const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

const recipepuppyHost = 'http://www.recipepuppy.com/api/?q=';
const currencyConvertHost = "http://api.fixer.io/latest?";
const chucknorrisHost = 'https://api.chucknorris.io/jokes/random';
const wikiPediaApiHost = 'https://pt.wikipedia.org/w/api.php?'; //https://www.mediawiki.org/wiki/API:Opensearch
const apiClimaTempo = 'http://apiadvisor.climatempo.com.br/api/v1/'; //http://apiadvisor.climatempo.com.br/doc/index.html

const apiKeyClimaTempo = 'fe159cd0aa11b594270ba7dc27a132a3';

app.get('/dummyget', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'speech': 'dummy speech', 'displayText': 'dummy get works!' }));
});


app.post('/webhook', function (req, res) {

    console.log("");
    console.log("");
    console.log(req.body.queryResult.action);
    console.log("");
    console.log("");
    
    if (req.body.queryResult.parameters['Bored']) {
        callChuckNorrisFact()
            .then((output) => {
                let result = toApiAiResponseMessage(output.value, output.value, toTelgramObject(output.value, 'Markdown'));
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(result));
            })
            .catch(errorHandler);
    }
    else if (req.body.queryResult.parameters['FoodItem']) {
        var fooditem = req.body.queryResult.parameters['FoodItem'];
        callRecipePuppy(fooditem)
            .then((output) => {

                let displayText = `Found recipe for: ${output.title} at ${output.href}`;
                let telegramText = htmlEntities('*Found*-' + output.title + '\n' + '* It has following Ingredients*-' + output.ingredients + '\n' + '* You can check it out at*- ' + output.href);
                let result = toApiAiResponseMessage(displayText, displayText, toTelgramObject(telegramText, 'Markdown'));
                console.log(result);
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(result));
            })
            .catch(errorHandler);
    }
    else if (req.body.queryResult.parameters['currency-from'] && req.body.queryResult.parameters['currency-to']) {
        var currencyFrom = req.body.queryResult.parameters['currency-from'];
        var currencyTo = req.body.queryResult.parameters['currency-to'];
        var number = 1.0;
        if (req.body.queryResult.parameters['number']) {
            number = parseFloat(req.body.queryResult.parameters['number']);
            if (number <= 0) {
                number = 1.0;
            }
        }
        callFixerIo(currencyFrom, currencyTo)
            .then((output) => {
                let resultText = Array();
                currencyTo.forEach(function (cur) {
                    var toNumber = number * parseFloat(output.rates[cur.toUpperCase()]);
                    toNumber = toNumber.toFixed(3);
                    resultText.push(`${number} ${output.base} = ${toNumber} ${cur}`);
                }, this);

                let displayText = resultText.join();
                let result = toApiAiResponseMessage(displayText, displayText, toTelgramObject(resultText.join('\n'), 'Markdown'));
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(result));
            });
    }
    else if (req.body.queryResult.parameters['wikisearchterm']) {

        console.log("buscando na wikipedia");

        var searchTerm = req.body.queryResult.parameters['wikisearchterm'];
        callWikiPediaApi(searchTerm)
            .then((output) => {
                let displayText = `nao achei nada sobre ${searchTerm}`;
                let result;
                if (output && output[0]) {
                    displayText = `${output[1][0]}: ${output[2][0]}`;
                    let telegramText = htmlEntities(`*${output[1][0]}*: ${output[2][0]} \n\n Read more at [WikiPedia](${output[3][0]})`);
                    result = toApiAiResponseMessage(displayText, displayText, toTelgramObject(telegramText, 'Markdown'));
                    console.log("resultado: " + telegramText);
                }
                res.setHeader('Content-Type', 'application/json');
                if (result) {
                    res.send(JSON.stringify(result));
                }
                else {
                    res.send(JSON.stringify(displayText));
                }
            });
    }
    else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ 'speech': "No Proper hook found", 'displayText': "No Proper hook found" }));
    }
});


function callRecipePuppy(fooditem) {
    return new Promise((resolve, reject) => {
        http.get(recipepuppyHost + fooditem, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                let jO = JSON.parse(body);
                let firstItem = jO.results[Math.floor((Math.random() * jO.results.length))];
                resolve(firstItem);
            });

            res.on('error', (error) => {
                reject(error);
            });
        });
    });
}

function callFixerIo(currencyFrom, currencyTo) {
    return new Promise((resolve, reject) => {
        currencyTo = currencyTo.join().toUpperCase();
        let url = `${currencyConvertHost}base=${currencyFrom}&symbols=${currencyTo}`;
        http.get(url, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                let jO = JSON.parse(body);
                resolve(jO);
            });

            res.on('error', (error) => {
                reject(error);
            });
        });
    });
}

function callChuckNorrisFact() {
    return new Promise((resolve, reject) => {
        https.get(chucknorrisHost, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                let jO = JSON.parse(body);
                resolve(jO);
            });

            res.on('error', (error) => {
                reject(error);
            });
        });
    });
}

function callWikiPediaApi(searchTerm, format = "json", action = "opensearch", limit = 2, profile = "fuzzy") {
    return new Promise((resolve, reject) => {
        let url = `${wikiPediaApiHost}&format=${format}&action=${action}&limit=${limit}&profile=${profile}&search=${searchTerm}`;
        https.get(url, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                let jO = JSON.parse(body);
                resolve(jO);
            });
            res.on('error', (error) => {
                reject(error);
            });
        });
    });
}


function toTelgramObject(text, parse_mode) {
    return {
        text: text,
        parse_mode: parse_mode
    }
}

function toApiAiResponseMessage(speech, displayText, telegramObject = null) {
    return {
        speech: speech,
        displayText: displayText,
        data: {
            telegram: telegramObject
        }
    }
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function errorHandler(error) {
    console.log(error);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(toApiAiResponseMessage(error, error, toTelgramObject(error, 'Markdown'))));
}

app.listen((process.env.PORT || 5000), function () {
    console.log("Server listening");
});
