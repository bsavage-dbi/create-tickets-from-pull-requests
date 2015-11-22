chrome.runtime.onInstalled.addListener(function (object) {
    chrome.tabs.create({url: 'chrome://extensions/?options=' + chrome.runtime.id}, function (tab) {
        //open the options page on install
    });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    checkForValidUrl(tab.url);
});

function checkForValidUrl(url) {
    // Compare with the URL
    if (url.match(/(github.com\/Thrillist\/.+compare\/)/)) {
        //if the url matches, send an event to the content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "check_tickets"});
        });
    }
};


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action == 'get_jira_info') {
        // Use default value 'unknown'
        chrome.storage.sync.get({
            jira_user: 'unknown',
            jira_password: 'unknown',
            jira_url: 'unknown',
            jira_project: 'unknown'
        }, function(items) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                var jiraInfo = JSON.stringify({
                    "user": items.jira_user,
                    "password": items.jira_password,
                    "project": items.jira_project,
                    "url": items.jira_url 
                });
                chrome.tabs.sendMessage(tabs[0].id, {action: "create_ticket", payload: jiraInfo});
            });
        });
    }
    else if (request.action == "xhttp") {
        var xhttp = new XMLHttpRequest();
        
        var method = request.method ? request.method.toUpperCase() : 'GET';

        if (method == 'POST') {
            xhttp.setRequestHeader('Content-Type', 'application/json');
            xhttp.setRequestHeader("X-Atlassian-Token", "nocheck");
        }

        xhttp.onload = function() {
            if (xhttp.status === 401 || xhttp.status === 404) {
                sendResponse(xhttp.status);
            }
            else {
                sendResponse(xhttp.responseText);
            }
        };
        xhttp.onerror = function() {
            // Do whatever you want on error. Don't forget to invoke the
            // callback to clean up the communication port.
            sendResponse(xhttp.status);
        };
        xhttp.open(method, request.url, true);
        xhttp.setRequestHeader('Authorization', 'Basic ' + request.credentials);
        if (xhttp.status === 401) {
            sendResponse({"errorMessages":["Invalid credentials"],"errors":{}});
        }
        xhttp.send(request.data);
        return true; // prevents the callback from being called too early on return
    }
    else if (request.action == "createTicket") {
        var xhttp = new XMLHttpRequest();
        
        var method = request.method ? request.method.toUpperCase() : 'GET';

        xhttp.onload = function() {
            sendResponse(xhttp.responseText);
        };
        xhttp.onerror = function() {
            // Do whatever you want on error. Don't forget to invoke the
            // callback to clean up the communication port.
            sendResponse();
        };
        xhttp.open(method, request.url, true);
        if (method == 'POST') {
            xhttp.setRequestHeader('Content-Type', 'application/json');
            xhttp.setRequestHeader("X-Atlassian-Token", "nocheck");
            xhttp.setRequestHeader('Authorization', 'Basic ' + request.credentials);
        }
        xhttp.send(request.data);
        return true; // prevents the callback from being called too early on return
    }
});