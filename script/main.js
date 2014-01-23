$(function() {
  var githubOrganisation = 'hoodiehq';
  // labelForNewCommitters is what you label simple issues for new committers with
  // Will expose a new button "show issues for new committers" if not empty
  var labelForNewCommitters = 'starter';

  function getIssues(filters){
    var query = 'per_page=100&q=user:' + encodeURIComponent(githubOrganisation);

    if(filters){
      if (filters.label) {
        query += '+label:' + filters.label;
      }
      if (filters.state) {
        query += '+state:' + filters.state;
      }
    }

    // cache for quick development
    return $.getJSON('./script/cache.json');

    // return $.ajax({
    //   url: 'https://api.github.com/search/issues',
    //   data: query
    // });
  }

  function mapDataItems (data) {
    return data.items;
  }

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

    return issues;
  }

  function render (issues) {
    var issueHTML = ich.issues({issues: issues});
    console.log("issues: ",issues);
    $(document.body).append(issueHTML);
  }

  function onError (error) {
    alert(error);
  }

  getIssues({state: 'open'})
  .then(mapDataItems)
  .then(addRepoInformation)
  .then(render)
  .fail(onError)
});
