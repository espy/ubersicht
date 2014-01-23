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
    labels: [],
    milestones: []
  };

  $('h1.title').append(' for github  / <a href="https://github.com/'+githubOrganisation+'">'+githubOrganisation+'</a>');

  $('input.orange').iCheck({
    checkboxClass: 'icheckbox_flat-orange',
    radioClass: 'iradio_flat-orange'
  });

  $('input.green').iCheck({
    checkboxClass: 'icheckbox_flat-green',
    radioClass: 'iradio_flat-green'
  });

  $('input.grey').iCheck({
    checkboxClass: 'icheckbox_flat-grey',
    radioClass: 'iradio_flat-grey'
  });

  // Events

  $('.controls').change(function(event){
    applyFilters()
  })

  $('select').on('change', function(event){
    applyFilters()
  })

  $('input').on('ifChanged', function(event){
    applyFilters()
  });

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
      // collect all repos and count how many issues they have
      var repo = _.findWhere(metadata.repos, {name: issue.repo_name});
      if(repo){
        repo.issues++;
      } else {
        metadata.repos.push({
          name: issue.repo_name,
          issues: 1
        })
      }

      // collect all labels and count how many issues they have
      var labels = issue.labels;
      labels.forEach(function(label){
        var metaLabel = _.findWhere(metadata.labels, {name: label.name});
        if(metaLabel){
          metaLabel.issues++;
        } else {
          metadata.labels.push({
            name: label.name,
            issues: 1,
            color: label.color
          })
        }
      })

      // collect all milestones and count how many issues they have
      if(issue.milestone){
        var milestone = _.findWhere(metadata.milestones, {name: issue.milestone.title});
        if(milestone){
          milestone.issues++;
        } else {
          metadata.milestones.push({
            name: issue.milestone.title,
            issues: 1
          })
        }
      }
    });

    updateControls();

    return issues;
  }

  function applyFilters(){
    var repos = $('#repos').val();
    var labels = $('#labels').val();
    var milestones = $('#milestones').val();
    var showClosed = false;
    if($('#showClosed').is(':checked')){
      showClosed = true
    }
    var showOpen = false;
    if($('#showOpen').is(':checked')){
      showOpen = true
    }
    var showCommented = false;
    if($('#showCommented').is(':checked')){
      showCommented = true
    }
    var showUncommented = false;
    if($('#showUncommented').is(':checked')){
      showUncommented = true
    }
    $('.issues > li').each(function(){
      var $this = $(this);
      var hide = 0;
      // Show closed
      if($this.hasClass('closed') && !showClosed){
        hide++;
      }
      // Show open
      if($this.hasClass('open') && !showOpen){
        hide++;
      }
      // Show commented
      if($this.find('.comments').length === 1 && !showCommented){
        hide++;
      }
      // Show uncommented
      if($this.find('.comments').length === 0 && !showUncommented){
        hide++;
      }
      // Filter by repos
      if(repos && repos.indexOf($this.attr('data-repo')) === -1){
        hide++;
      }
      // Filter by milestones
      if(milestones && milestones.indexOf($this.find('.milestone').text()) === -1){
        hide++;
      }
      // Filter by labels
      var thisLabels = $this.find('.labels>li').map(function() {return $(this).text()}).get();
      var intersection = _.intersection(labels, thisLabels)
      if(labels && intersection && intersection.length != labels.length){
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
    var repoSelectorHTML = ich.repoSelector({repos: metadata.repos});
    $('.controls').append(repoSelectorHTML);
    var labelSelectorHTML = ich.labelSelector({labels: metadata.labels});
    $('.controls').append(labelSelectorHTML);
    var milestoneSelectorHTML = ich.milestoneSelector({milestones: metadata.milestones});
    $('.controls').append(milestoneSelectorHTML);
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
