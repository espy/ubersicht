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
  var githubOrganisation = 'hasadna';
  useHash()
  // labelForNewCommitters is what you label simple issues for new committers with
  // Will expose a new button "show issues for new committers" if not empty
  var labelForNewCommitters = 'starter';
  // Place to store metadata about all the loaded issues
  window.metadata = {
    open: 0,
    closed: 0,
    newOpen: 0,
    openedLastWeek: 0,
    closedLastWeek: 0,
    newClosed: 0,
    repos: [],
    labels: [],
    milestones: [],
    usernames: []
  };
  var applyFiltersDebounced = _.debounce(applyFilters, 300);

  // Fetch the hash value from the url
  function useHash(){
    if(window.location.hash != ""){
      githubOrganisation = window.location.hash.substr(1);
    } else {
      window.location.hash = githubOrganisation;
    }
  }

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

  // Check if browser supports the hash change event
  if ("onhashchange" in window) {
    window.onhashchange = locationHashChanged;
  }

  // Avoids having to akwardly mash enter twice
  function locationHashChanged() {
    window.location.reload();
  }

  // Whatever changes in .controls: filter all the things!
  $('.controls').change(applyFiltersDebounced);

  $('select').on('change', applyFiltersDebounced);

  $('input').on('ifChanged', applyFiltersDebounced);

  // A helper to only show open issues with a label meant for new committers.
  // You can set this `labelForNewCommitters` yourself at the top of this file.
  // This is the reason applyFilters is debounced, by the way.
  $('.showStarter').click(function(event){
    event.preventDefault();
    $('#showOpen').iCheck('check');
    $('#showClosed').iCheck('uncheck');
    $('#showCommented').iCheck('check');
    $('#showUncommented').iCheck('check');
    $('#last24Hours').iCheck('uncheck');
    $("#repos").val("").trigger("change");
    $("#labels").val(labelForNewCommitters).trigger("change");
    $("#milestones").val("").trigger("change");
    $("#usernames").val("").trigger("change");
  });

  // A helper to only show closed issues from the last 24 hours.
  $('header').on('click', '.showNewClosed a', function(event){
    event.preventDefault();
    $('#showOpen').iCheck('uncheck');
    $('#showClosed').iCheck('check');
    $('#showCommented').iCheck('check');
    $('#showUncommented').iCheck('check');
    $('#last24Hours').iCheck('check');
    $('#lastWeek').iCheck('uncheck');
    $("#repos").val("").trigger("change");
    $("#labels").val("").trigger("change");
    $("#milestones").val("").trigger("change");
    $("#usernames").val("").trigger("change");
  });

  // A helper to only show closed issues from the last week
  $('header').on('click', '.showClosedLastWeek a', function(event){
    event.preventDefault();
    $('#showOpen').iCheck('uncheck');
    $('#showClosed').iCheck('check');
    $('#showCommented').iCheck('check');
    $('#showUncommented').iCheck('check');
    $('#last24Hours').iCheck('uncheck');
    $('#lastWeek').iCheck('check');
    $("#repos").val("").trigger("change");
    $("#labels").val("").trigger("change");
    $("#milestones").val("").trigger("change");
    $("#usernames").val("").trigger("change");
  });

  // A helper to only show new issues from the last 24 hours.
  $('header').on('click', '.showNewOpen a', function(event){
    event.preventDefault();
    $('#showOpen').iCheck('check');
    $('#showClosed').iCheck('uncheck');
    $('#showCommented').iCheck('check');
    $('#showUncommented').iCheck('check');
    $('#last24Hours').iCheck('check');
    $('#lastWeek').iCheck('uncheck');
    $("#repos").val("").trigger("change");
    $("#labels").val("").trigger("change");
    $("#milestones").val("").trigger("change");
    $("#usernames").val("").trigger("change");
  });

  // A helper to only show new issues from the last 24 hours.
  $('header').on('click', '.showOpenedLastWeek a', function(event){
    event.preventDefault();
    $('#showOpen').iCheck('check');
    $('#showClosed').iCheck('uncheck');
    $('#showCommented').iCheck('check');
    $('#showUncommented').iCheck('check');
    $('#last24Hours').iCheck('uncheck');
    $('#lastWeek').iCheck('check');
    $("#repos").val("").trigger("change");
    $("#labels").val("").trigger("change");
    $("#milestones").val("").trigger("change");
    $("#usernames").val("").trigger("change");
  });

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
    //return $.getJSON('./script/cache.json');

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

  // The github search occasionally returns issues in the wrong order, so we fix that
  function sortIssuesByDate(issues){
    return _.sortBy(issues, function(issue){ return issue.updated_at; }).reverse();
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
    var yesterday = new Date();
    var today = yesterday.getDate();
    yesterday.setDate(today - 1);
    metadata.yesterdayISO = yesterday.toISOString();
    var oneWeekAgo = new Date();
    oneWeekAgo.setDate(today - 7);
    metadata.aWeekAgoISO =  oneWeekAgo.toISOString();
    issues.forEach(function(issue){
      // Count how many open and closed issues we loaded
      if(issue.state === 'open'){
        if(issue.created_at > metadata.yesterdayISO){
          metadata.newOpen++;
        }
        if(issue.created_at > metadata.aWeekAgoISO){
          metadata.openedLastWeek++;
        }
        metadata.open++;
      } else {
        if(issue.closed_at > metadata.yesterdayISO){
          metadata.newClosed++;
        }
        if(issue.closed_at > metadata.aWeekAgoISO){
          metadata.closedLastWeek++;
        }
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
      // collect all creators and count how many issues they have
      if(issue.user){
        var username = _.findWhere(metadata.usernames, {username: issue.user.login});
        if(username){
          username.issues++;
        } else {
          metadata.usernames.push({
            username: issue.user.login,
            issues: 1
          })
        }
      }

      // collect all assignees and count how many issues they have
      if(issue.assignee){
        var assignee = _.findWhere(metadata.usernames, {username: issue.assignee.login});
        if(assignee){
          assignee.issues++;
        } else {
          metadata.usernames.push({
            username: issue.assignee.login,
            issues: 1
          })
        }
      }
    });

    function sortLists(list, compare) {
      list.sort(function(a, b) {
        if(a[compare] === b[compare]) {
          return 0;
        }
        return a[compare] > b[compare] ? 1 : -1;
      });
    };
    sortLists(metadata.labels, 'name');
    sortLists(metadata.usernames, 'username');
    sortLists(metadata.milestones, 'name');
    sortLists(metadata.repos, 'name');

    updateControls();

    return issues;
  }

  // Apply the current filters to the issues list
  function applyFilters(){
    // Fetch current filter values
    var repos = $('#repos').val();
    var labels = $('#labels').val();
    var milestones = $('#milestones').val();
    var usernames = $('#usernames').val();
    var showClosed = $('#showClosed').is(':checked');
    var showOpen = $('#showOpen').is(':checked');
    var showCommented = $('#showCommented').is(':checked');
    var showUncommented = $('#showUncommented').is(':checked');
    var onlyLast24Hours = $('#last24Hours').is(':checked');
    var onlyLastWeek = $('#lastWeek').is(':checked');

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
      // Show issues from last 24 hours
      if(onlyLast24Hours){
        if($this.hasClass('closed') && $this.data('closedat') < metadata.yesterdayISO){
          hide++
        }
        if($this.hasClass('open') && $this.data('createdat') < metadata.yesterdayISO){
          hide++
        }
      }
      // Show created in last 24 hours
      if(onlyLastWeek){
        if($this.hasClass('closed') && $this.data('closedat') < metadata.aWeekAgoISO){
          hide++
        }
        if($this.hasClass('open') && $this.data('createdat') < metadata.aWeekAgoISO){
          hide++
        }
      }
      // Filter by repos
      if(repos && repos.indexOf($this.attr('data-repo')) === -1){
        hide++;
      }
      // Filter by milestones
      if(milestones && milestones.indexOf($this.find('.milestone').text()) === -1){
        hide++;
      }
      // Filter by usernames
      if(usernames && usernames.indexOf($this.attr('data-username')) === -1 && usernames.indexOf($this.attr('data-assignee')) === -1){
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

    // update URL
    var loc = window.location;
    var baseUrl = [loc.protocol, '//', loc.host, loc.pathname].join('') ;
    var qs = [
      'showOpen=' + showOpen,
      'showClosed=' + showClosed,
      'showCommented=' + showCommented,
      'showUncommented=' + showUncommented,
      'last24Hours=' + onlyLast24Hours,
      'lastWeek=' + onlyLastWeek,
      'repos=' + repos,
      'labels=' + labels,
      'milestones=' + milestones,
      'usernames=' + usernames
    ].join('&');

    var newUrl = baseUrl + '?' + qs + loc.hash;
    history.pushState(null, null, newUrl);

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
    var usernamesSelectorHTML = ich.usernamesSelector({usernames: metadata.usernames});
    $('.controls').append(usernamesSelectorHTML);
    $("select").select2();
    // add weekle total
    var openData = {
      action: "showOpenedLastWeek",
      url: "#",
      data: metadata.openedLastWeek,
      info: "New issues in the last week"
    }
    var openStatusHTML = ich.status(openData);
    $('.statusIndicators').append(openStatusHTML);
    var closedData = {
      action: "showClosedLastWeek",
      url: "#",
      data: metadata.closedLastWeek,
      info: "Issues done the last week"
    }
    // add daily totals - if they are not zero
    var closedStatusHTML = ich.status(closedData);
    $('.statusIndicators').append(closedStatusHTML);
    if (metadata.newOpen > 0) {
      openData = {
        action: "showNewOpen",
        url: "#",
        data: metadata.newOpen,
        info: "New issues in the past 24h"
      }
      openStatusHTML = ich.status(openData);
      $('.statusIndicators').append(openStatusHTML);
    }
    if (metadata.newClosed > 0) {
      closedData = {
        action: "showNewClosed",
        url: "#",
        data: metadata.newClosed,
        info: "Issues done in the past 24h"
      }
      closedStatusHTML = ich.status(closedData);
      $('.statusIndicators').append(closedStatusHTML);
    }
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
      length = "Sorry, there aren't any issues for these filter settings :/";
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

 // populate filters
  function parseURLFilters () {
    var qss = window.location.search.substr(1).replace(/\/$/, '');
    if(qss.length == 0) {
      return {
        showOpen: 'true',
        showClosed: 'true',
        showCommented: 'true',
        showUncommented: 'true',
        repos: '',
        labels: '',
        milestones: '',
        usernames: '',
        last24Hours: false
      };
    }
    var qsPairs = qss.split('&');
    var qs = {};
    qsPairs.forEach(function(pair) {
      var qsPair = pair.split('=');
      var key = qsPair[0];
      var value = qsPair[1];
      qs[key] = value;
    });
    return qs;
  }

  function applyUrlFilters () {
    var urlFilters = parseURLFilters();

    var checkboxes = [
      'showOpen',
      'showClosed',
      'last24Hours',
      'showStarter',
      'showCommented',
      'showUncommented'
    ];

    var selectboxes = [
      'repos',
      'labels',
      'usernames',
      'milestones'
    ];

    checkboxes.forEach(function(checkbox) {
      $('#' + checkbox).iCheck(urlFilters[checkbox] === 'true'?'check':'uncheck');
    });

    selectboxes.forEach(function(selectbox) {
      $('#' + selectbox).select2('val', urlFilters[selectbox].split(','));
    });

    applyFilters();
  }

  /*
  function getGittip(){
    var hash = window.location.hash;
    if(!hash || hash === "") return;
    $.get('https://cors-io.herokuapp.com/www.gittip.com/'+hash, function(data){
      data = data.replace(/img/g, 'span')
      var html = $('.total-receiving', $.parseHTML(data)).text();
      console.log('total: '+html)
    });
  }
  */

  // 3
  // …
  // 2
  // …
  // 1
  // …
  // GO!
  getIssues({})
  .then(mapDataItems)
  .then(removeDuplicates)
  .then(sortIssuesByDate)
  .then(addRepoInformation)
  .then(getMetadata)
  .then(render)
  .then(applyUrlFilters)
});
