# Ubersicht

Ubersicht is a lightweight, frontend only dashboard for all the public repos of any github organisation. Change the hash in the url to your github user or organisation name to use it for yourself. [Give it a try](http://espy.github.io/ubersicht)!

![Screenshot of Ubersicht](http://blog.hood.ie/wp-content/uploads/2014/01/ubersicht.png)

It runs as a gh-page, so you can just fork this repo, change the `githubOrganisation`-variable in `main.js` and you've got your own public github dashboard you can style and mod at your whim.

Ubersicht filters milestones by name, not by id, which means that if you use consistent milestone names across repos, you can have quasi-cross-repo milestones. How cool is that?

It requires no API key and no data storage and only uses a single API request to fetch data.

Yeah.

If this makes you happy or you'd like me to keep working on it, please let me know or possibly even [gittip me](https://www.gittip.com/espy).

Thanks!

## Planned features

- Overviews:
    - new issues in the last 24h (since last visit)
    - newly commented issues in the last 24h (since last visit)

