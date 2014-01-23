$(function() {
  var githubOrganisation = 'hoodiehq';
  if(window.location.hash != ""){
    githubOrganisation = window.location.hash.substr(1);
  }
  // labelForNewCommitters is what you label simple issues for new committers with
  // Will expose a new button "show issues for new committers" if not empty
  var labelForNewCommitters = 'starter';
  var metadata = {
    open: 0,
    closed: 0,
    repos: [],
    labels: {},
    milestones: {}
  };

  $('h1.title').append(" for github  / "+githubOrganisation);

  // Events

  $('.controls').change(function(event){
    applyFilters()
  })

  $('#repos').on('change', function(event){
    applyFilters()
  })

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
    // return $.getJSON('./script/cache.json');

    return $.ajax({
      url: 'https://api.github.com/search/issues',
      data: query
    });
  }

  function mapDataItems (data) {
    return data.items;
  }

  function removeDuplicates(issues){
    issues.forEach(function(issue){
      var duplicates = _.where(issues, {id: issue.id});
      if(duplicates.length > 1){
        _.rest(duplicates).forEach(function(duplicate){
          duplicate.ignore = true;
        })
      }
    });
    var validIssues = _.reject(issues, function(issue){
      if(issue.ignore){
        return true;
      }
    });

    return validIssues;
  }

  function addRepoInformation(issues){
    issues.forEach(function(issue){
      if(issue.ignore === undefined){
        issue.repo_name = issue.url.split('/')[5]
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
      } else {
        issue = undefined;
      }
    });

    return issues;
  }

  function getMetadata (issues) {
    issues.forEach(function(issue){
      if(issue.state === 'open'){
        metadata.open++;
      } else {
        metadata.closed++;
      }

      var repo = _.findWhere(metadata.repos, {name: issue.repo_name});
      if(repo){
        repo.issues++;
      } else {
        metadata.repos.push({
          name: issue.repo_name,
          issues: 1
        })
      }
    });

    updateControls();

    return issues;
  }

  function applyFilters(){
    var repos = $('#repos').val();
    var showClosed = false;
    if($('#showClosed').is(':checked')){
      showClosed = true
    }
    var showOpen = false;
    if($('#showOpen').is(':checked')){
      showOpen = true
    }
    $('.issues > li').each(function(){
      var $this = $(this);
      var hide = 0;
      // Show closed
      if($(this).hasClass('closed') && !showClosed){
        hide++;
      }
      // Show open
      if($(this).hasClass('open') && !showOpen){
        hide++;
      }
      // Filter by repo
      if(repos && repos.indexOf($this.attr('data-repo')) === -1){
        hide++;
      }
      if(hide === 0){
        $this.show();
      } else {
        $this.hide();
      }
    });
  }

  function updateControls(){
    $('#showOpen + label').text("Show "+metadata.open+" open issues");
    $('#showClosed + label').text("Show "+metadata.closed+" closed issues");
    console.log("repos",metadata.repos);
    var repoSelectorHTML = ich.repoSelector({repos: metadata.repos});
    $('.controls').append(repoSelectorHTML);
    $("select").select2();
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
  .then(removeDuplicates)
  .then(addRepoInformation)
  .then(getMetadata)
  .then(render)
  .fail(onError)
});
