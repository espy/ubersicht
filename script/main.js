$(function() {
  var githubOrganisation = "hoodiehq";

  function getIssues(label, callback){
    var query = 'q=user:' + encodeURIComponent(githubOrganisation)
                          + '+state:open'
                          + '&per_page=100';
    if(label){
      query += '+label:' + label;
    }
    $.ajax({
      url: 'https://api.github.com/search/issues',
      data: (
        query
      ),
      error: callback,
      success: function (data) {
        callback(null, data.items);
      }
    });
  }

  getIssues(null, null, function (err, issues) {
    console.log("issues: ",issues);
    addRepoInformation(issues);
    var issueHTML = ich.issues({issues: issues});
    $('body').append(issueHTML);
  });

  function addRepoInformation(issues){
    issues.forEach(function(issue){
      issue.name = issue.url.split('/')[5]
      issue.repo_url = issue.url.replace('api.', '').replace('repos/', '').split('/').slice(0,-1).join('/');
      switch(issue.comments){
        case 0:
        issue.comments = "";
        break;
        case 1:
        issue.comments = "1&nbsp;comment";
        break;
        default:
        issue.comments = issue.comments + "&nbsp;comments";
        break;
      }
      if(issue.milestone){
        issue.milestone.html_url = issue.milestone.url.replace('api.', '').replace('repos/', '').replace('milestones/', 'issues?milestone=');
      }
    });
  }

});
