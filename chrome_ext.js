/**

	GitHub is a nightmare for chrome extensions because of the way it loads pages
 	We're never sure if our chrome extension will fire - so it is possible that someone will be on the page and we wont
 	kick off our chrome extension.
 	The best we can do, is listen on the eventPage.js for a change in the tab's url. If the url changes, check it with a regex.
 	If a regex matches what we want, we'll dispatch an event to this content script and kick off the process of checking for tickets

**/
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action == "check_tickets") {
    	checkForTickets();
    }
    else if (request.action == "create_ticket") {
    	var jiraInfo = JSON.parse(request.payload);
    	createTicket(jiraInfo);
    }
 });

function checkForTickets(){
	// First, check if the branch has tickets
	var branch = getBranch();

	// Branches dont have white space like commits or titles do, so we can't use the containsTickets() function
	if (branch.match(/([A-Za-z]+-[0-9]+)/) != null) {
	}
	else {
		// Second, check if the pull request title has tickets
		var pullRequestHasTickets = checkForTicketsInPullRequestTitle();
		if (pullRequestHasTickets == true) {
			// stop looking
		}
		else {
			// Third, check if commits in the pull request have tickets
			var commits = getPullRequestCommits();
			var commitsHaveTickets = checkCommitsForTickets(commits);
			if (commitsHaveTickets == true) {
				// stop looking
			}
			else {
				launchWarningMessage();
				toggleCreateButtonAvailability("disable");
			}

		}
	}
}

function checkForTicketsInPullRequestTitle() {
	var pullRequestTitle = document.getElementById("pull_request_title");
	var pullRequestHasTickets = containsTickets(pullRequestTitle);
	if (pullRequestHasTickets === true) {
		return true;
	}
	else {
		return false;
	}
}

function getPullRequestCommits() {
	// There is no good way to get only the commits that were made when this branch was creaeted via the GitHub API
	// So instead, I'll scrape the page for the commit messages (since these are the only ones I care about) and pray to god that GitHub's updates don't break this :(
	var HTMLcommitMessages = document.getElementsByClassName('commit-message');
	var commitMessages = [];
	
	var i = 0;
	while (i < HTMLcommitMessages.length) {
		var commitMessage = HTMLcommitMessages[i].firstChild.nextSibling.innerText;
		commitMessages.push(commitMessage);

		i++;
	}

	return commitMessages;
}

function checkCommitsForTickets(commits) {
	var commitHasTickets = false;
	
	var i = 0;
	while (i < commits.length) {
		var commitHasTickets = containsTickets(commits[i]);
		if (commitHasTickets === true) {
			i += commits.length;
		}
		else {
			i++;
		}
	}
	return commitHasTickets;
}

function getBranch() {
	// (I think) the most reliable thing to do is to look at the URL and strip the branch after the compare...
	// I take the ...branch?url=parameters from the url and so I have strip all of the extra crap from that to get just the branch
	if (document.URL.match(/\.\.\./) != null) {
		var branch = /\.\.\.(.*?)(\?|$)/.exec(document.URL)[0];
		branch = branch.split('...')[1];
	}
	else {
		var branch = /compare\/(.*?)(\?|$)/.exec(document.URL)[0];
	}
	if (branch.indexOf('?') != -1) {
		branch = branch.slice(0, branch.indexOf('?'));
	}
	return branch;
}

function containsTickets(text) {
	var ticketsFound = String(text).match(/(?:\s|^)([A-Za-z]+-[0-9]+)(?=\s|$)/);
	if (ticketsFound != null) {
		return true;
	}
	else {
		return false;
	}
}

function launchWarningMessage() {
	var warningCopy = getCopy("warning");
	document.getElementById('js-flash-container').innerHTML = '<div class="flash flash-full flash-notice"><div class="container"><button class="flash-close js-flash-close"><span class="octicon octicon-x"></span></button><span class="octicon octicon-alert"></span> <strong>' + warningCopy + '</strong> There is no JIRA ticket associated with this branch, please <a href="#" id="createTicketLink">create a ticket here</a>.</div></div>';
	var createTicketLink = document.getElementById("createTicketLink");
	createTicketLink.onclick = function() {
		requestJiraInfo();
	}
}

function launchSuccessMessage(url, ticket) {
	var successCopy = getCopy("success");
	document.getElementById('js-flash-container').innerHTML = '<div class="flash flash-full flash-notice"><div class="container"><button class="flash-close js-flash-close"><span class="octicon octicon-x"></span></button><span class="octicon octicon-check"></span> <strong>' + successCopy + '</strong> <a href="'+ url + '/browse/' + ticket + '" target="_blank">' + ticket +'</a> has been created.</div></div>';
}

function getCopy(type) {
	var copy = "";
	var successOptions = [
		"You rock!",
		"Amaze.",
		"You're awesome.",
		"Ta da!",
		"Bada bing.",
		"Awesome!",
		"Woot!",
		"YASSSS.",
		"Thank ya kindly...",
		"Aw yea..."
	];
	var warningOptions = [
		"Slow down, Eager McBeaver.",
		"Slow down, cowboy.",
		"Hold up. Wait a minute.",
		"Stop. Collaborate. Listen.",
		"What do we have here...",
		"Wait a tick...",
		"Hold it right there.",
		"Slow your roll.",
		"Mi Scusi...",
		"For shame..."
	];
	if (type == "success") {
		copy = successOptions[Math.floor(Math.random() * successOptions.length)];
	}
	else if (type == "warning") {
		copy = warningOptions[Math.floor(Math.random() * warningOptions.length)];
	}
	return copy;
}

function amendPullRequestTitle(ticket) {
	var originalPullRequestTitle = $("#pull_request_title").val();
	var amendedPullRequestTitle = ticket + " " + originalPullRequestTitle;

	$("#pull_request_title").val(amendedPullRequestTitle);
}

function toggleCreateButtonAvailability(toggle) {
	var createForm = document.getElementById("new_pull_request");
	var createButton = $(createForm).find(':submit');	
	
	if (toggle === "disable") {
		$(createButton[0]).addClass("disabled");
	}
	else {
		$(createButton[0]).removeClass("disabled");
	}
}

function requestJiraInfo() {
	/* 	
		all this function does is reuest the eventPage.js to look for jira credentials in local storage
		the eventPage.js will return with "unknown" or the jira credentials.
		right after the credz get passed back, we kick off the createTicket() function
	*/
	var jiraInfo;
	chrome.runtime.sendMessage(
		{
			action: 'get_jira_info'
		}, 

		function(response) {
			// do nothing
	});
}

function createTicket(jiraInfo) {
	var user = jiraInfo.user;
	var password = jiraInfo.password;
	var url = jiraInfo.url;
	var project = jiraInfo.project;

	var pullRequestTitle = $("#pull_request_title").val();
	var credentials = btoa(user + ":" + password);

	var ticketData = JSON.stringify({
		"fields": {
			"project": {
				"key": project
			},
			"summary": pullRequestTitle,
			"description": "Creating ticket automatically with chrome extension",
			"issuetype": {
				"name": "Task"
			},
			"assignee": {
				"name": user
			}
		}
	});

	//POST to JIRA and create a ticket
	chrome.runtime.sendMessage(
		{
	    method: 'POST',
	    action: 'createTicket',
	    credentials: credentials,
	    url: url + '/rest/api/2/issue/',
	    data: ticketData
		}, 
	// on the call back, change to a success message, add ticket to PR title and make create button available
	function(response) {
		response = JSON.parse(response);
		var ticket = response.key;

		launchSuccessMessage(url, ticket);
		amendPullRequestTitle(ticket);
		toggleCreateButtonAvailability("enable");

	});
}
