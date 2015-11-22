// Saves options to chrome.storage
function save_options() {
  clearMsg();
  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  var project  = document.getElementById('project').value;
  var url      = document.getElementById('url').value;
  
  var credentials = username + ":" + password;
  credentials = btoa(credentials);
  
  chrome.storage.sync.set({
    jira_user: username,
    jira_password: password,
    jira_project: project,
    jira_url: url
  }, function() {
      // after we save the info, send a GET to JIRA and let's check if
      // a) the credentials work
      // b) the project exists
      chrome.runtime.sendMessage(
        {
          method: 'GET',
          action: 'xhttp',
          credentials: credentials,
          url: url + '/rest/api/2/project/' + project
        }, 
        function(response) {
          console.log('response');
          console.log(response);
          if (response == 401 || response === 404) {
            document.getElementById('errorMsg').className = "alert alert-danger fade-in";
          }
          else if (response == "") {
            document.getElementById('errorMsg').className = "alert alert-danger fade-in";
          }
          else {
            response = JSON.parse(response);

            if (response.errorMessages) {
              var i = 0;
              while (i < response.errorMessages.length) {
                if (response.errorMessages[i].match(/No project could be found/)) {
                  document.getElementById('warningMsg').className = "alert alert-warning fade-in";
                  i += response.errorMessages.length;
                }
                i++;
              }
            }
            else {
              // Show message to let user know options were saved.
              document.getElementById('successMsg').className = "alert alert-success fade-in";
            }
          }
        }
      );
      if (isMessageDisplayed === false) {
        document.getElementById('errorMsg').className = "alert alert-danger fade-in";
      }
      //setTimeout(function(){ clearMsg(); }, 5000);
  });
}

function isMessageDisplayed() {
  var successMsg = document.getElementById('successMsg');
  var warningMsg = document.getElementById('warningMsg');
  var errorMsg   = document.getElementById('errorMsg');
  if (successMsg.classList.contains('hidden') && warningMsg.classList.contains('hidden') && errorMsg.classList.contains('hidden')){
    return false
  }
  else {
    return true;
  }
}

function clearMsg() {
  document.getElementById('successMsg').className = "alert alert-success hidden";
  document.getElementById('warningMsg').className = "alert alert-warning hidden";
  document.getElementById('errorMsg').className   = "alert alert-warning hidden";
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Set default values
  chrome.storage.sync.get({
    jira_user: 'unknown',
    jira_password: 'unknown',
    jira_project: 'not set',
    jira_url: 'https://jira.atlassian.net'
  }, function(items) {
    console.log(items);
    var username = items.jira_user;
    var password = items.jira_password;
    var project  = items.jira_project;
    var url      = items.jira_url;
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
    document.getElementById('project').value  = project;
    document.getElementById('url').value      = url;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);