/*
 * Ubersicht
 * ---------
 *
 * Ubersicht is a lightweight, frontend only dashboard for all
 * the public repos of any github organisation.
 *
 * Repo: https://github.com/espy/ubersicht
 * Live: http://espy.github.io/ubersicht
 *
 * Alex Feyerke     (https://github.com/espy, @espylaub)
 * Caolan McMahon   (https://github.com/caolan, @caolan)
 * Gregor Martynus  (https://github.com/gr2m, @gr2m)
 *
 * 2014
 *
 * Thanks to @hoodiehq and all the wonderful people who make open-source
 * software and libraries that make development faster, simpler and more fun.
 *
 */

$(function() {
  // The github user or organisation you'd like to load issues for
  // Defaults to hoodiehq!
  var githubOrganisation = 'hoodiehq';
  if(window.location.hash != ""){
    githubOrganisation = window.location.hash.substr(1);
  } else {
    window.location.hash = githubOrganisation;
  }
  // labelForNewCommitters is what you label simple issues for new committers with
  // Will expose a new button "show issues for new committers" if not empty
  var labelForNewCommitters = 'starter';
  // Place to store metadata about all the loaded issues
  var metadata = {
    open: 0,
    closed: 0,
    repos: [],
    labels: [],
    milestones: []
  };

  // Show loading message in header
  $('h1.title').append(' is loading github  / <a href="https://github.com/'+githubOrganisation+'">'+githubOrganisation+'</a>');

  // Icheck is a little umständlich here
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

  // Whatever changes in .controls: filter all the things!
  $('.controls').change(applyFilters);

  $('select').on('change', applyFilters);

  $('input').on('ifChanged', applyFilters);

  // A helper to only show open issues with a label meant for new committers.
  // You can set this `labelForNewCommitters` yourself at the top of this file.
  $('.showStarter').click(function(event){
    event.preventDefault();
    $('#showOpen').iCheck('check');
    $('#showClosed').iCheck('uncheck');
    $("#repos").val("").trigger("change");
    $("#labels").val(labelForNewCommitters).trigger("change");
    $("#milestones").val("").trigger("change");
  })

  // Fetch the organisation's issues with a single search request.
  // This is rate-limited to 5 requests per minute, which should be enough.
  function getIssues(filters){
    var query = 'per_page=100&sort=updated&q=user:' + encodeURIComponent(githubOrganisation);

    if(filters){
      if (filters.label) {
        query += '+label:' + filters.label;
      }
      if (filters.state) {
        query += '+state:' + filters.state;
      }
    }

    // Cache for quick development
    // return $.getJSON('./script/cache.json');

    // The real request
    return $.ajax({
      url: 'https://api.github.com/search/issues',
      data: query
    });
  }

  function mapDataItems (data) {
    return data.items;
  }

  // The github search occasionally returns duplicates, this filters them out
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

  // Some things aren't included in the JSON form the search query,
  // so we modify each issue to contain the missing data
  function addRepoInformation(issues){
    issues.forEach(function(issue){
      // Only modify issues that aren't flagged as duplicates by removeDuplicates()
      if(issue.ignore === undefined){
        // generate repo name from repo url
        issue.repo_name = issue.url.split('/')[5]
        // generate http repo-url from git url
        issue.repo_url = issue.url.replace('api.', '').replace('repos/', '').split('/').slice(0,-1).join('/');
        // Pluralisation for the comment counter
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
        // generate http milestone-url from git url
        if(issue.milestone){
          issue.milestone.html_url = issue.milestone.url.replace('api.', '').replace('repos/', '').replace('milestones/', 'issues?milestone=');
        }
      } else {
        // If it's a duplicate, remove it
        issue = undefined;
      }
    });

    return issues;
  }

  // Crawl the issues for some metadata we need for the filters
  function getMetadata (issues) {
    issues.forEach(function(issue){
      // Count how many open and closed issues we loaded
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

  // Apply the current filters to the issues list
  function applyFilters(){
    // Fetch current filter values
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
    // Do the actual filtering
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

    updateSummary();
  }

  // Once we have all the metadata, we can populate the filters
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

  // Render the whole thing
  function render (issues) {

    $('h1.title').replaceWith('<h1 class="title"><strong>Ubersicht</strong> github  / <a href="https://github.com/'+githubOrganisation+'">'+githubOrganisation+'</a></h1>');

    $('.checkboxes').removeClass('hide');
    var issueHTML = ich.issues({issues: issues});
    $(document.body).append(issueHTML);
    $("time.timeago").timeago();
    updateSummary();
  }

  function updateSummary () {
    var length = $('.issues > li:visible').length;
    switch(length){
      case 0:
      length = "No issues";
      break;
      case 1:
      length = "1 issue";
      break;
      default:
      length = length + " issues";
      break;
    }
    $('.summary').text(length);
  }

  // 3
  // …
  // 2
  // …
  // 1
  // …
  // GO!
  getIssues({state: 'open'})
  .then(mapDataItems)
  .then(removeDuplicates)
  .then(addRepoInformation)
  .then(getMetadata)
  .then(render);
});
