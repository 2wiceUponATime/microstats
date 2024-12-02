import { send, get_projects, socket } from "./api.js";
import { add_row, sort, reset, reload, project_link } from "./table.js";

window.user = localStorage.user;

function compare(a, b) {
  return a > b ? 1 : a < b ? -1 : 0
}

async function load_stats() {
  if (!user) {
    return;
  }

  reset();

  const table = document.getElementById("projects");
  while (table.length > 1) {
    table.removeChild(table.children[1]);
  }

  const user_input = document.getElementById("user");
  document.getElementById("submit").innerText = "Change user"
  user_input.placeholder = user;
  user_input.value = "";

  table.style.display = "";
  
  const project_stats = {};
  const progress = document.getElementById("progress");
  let total = 0;
  let loaded = 0;

  const promises = [];
  const promise_done = new Promise(res => {
    get_projects(user, (projects, done) => {
      total += projects.length;
      if (done) {
        res();
      }
      for (const project of projects) {
        promises.push(new Promise(async res => {
          let result = await send({
            name: "get_project_comments",
            project: project.id,
          });
          project_stats[project.slug] = {
            title: project.title,
            likes: project.likes,
            comments: result.comments.length,
          }
          add_row(project.title, project.slug, project.likes, result.comments.length);
          progress.innerText = `${++loaded}/${total}`;
          res();
        }));
      }
    });
  });

  await promise_done;
  for (const promise of promises) {
    await promise;
  }
  sort((a, b) => {
    return compare(b[2], a[2]);
  })
  reload();

  /*
  let loaded = 0;
  for (const project of projects) {
    let result = await send({
      name: "get_project_comments",
      project: project.id,
    })
    project_stats[project.slug] = {
      title: project.title,
      likes: project.likes,
      comments: result.comments.length
    }
    const row = document.createElement("tr");
    add_cell(row, project_link(project.slug, project.title));
    add_cell(row, project.slug);
    add_cell(row, project.likes);
    add_cell(row, result.comments.length);
    table.appendChild(row);
    progress.innerText = `${++loaded}/${projects.length}`;
  }
  */

  let project_stats_old = localStorage.project_stats;
  if (!project_stats_old) {
    project_stats_old = {};
  } else {
    project_stats_old = JSON.parse(project_stats_old);
  }

  const alerts = document.createElement("div");
  alerts.id = "alerts";
  for (const slug in project_stats_old) {
    const stats_old = project_stats_old[slug];
    const stats = project_stats[slug];
    if (!stats) {
      continue;
    }
    const title = stats.title;
    let new_likes;
    if (new_likes = stats.likes - stats_old.likes) {
      let plural = new_likes == 1 ? "" : "s";
      alerts.appendChild(project_link(slug, title));
      alerts.appendChild(new Text(` has ${new_likes} new like${plural}!`));
      alerts.appendChild(document.createElement("br"));
    }
    let new_comments;
    if (new_comments = stats.comments - stats_old.comments) {
      let plural = new_comments == 1 ? "" : "s";
      alerts.appendChild(project_link(slug, title));
      alerts.appendChild(new Text(` has ${new_comments} new comment${plural}!`));
      alerts.appendChild(document.createElement("br"));
    }
  }
  document.getElementById("alerts").replaceWith(alerts);

  localStorage.project_stats = JSON.stringify(project_stats);
}

socket.onopen = load_stats;

if (user) {
  document.getElementById("submit").innerText = "Change user"
  document.getElementById("user").placeholder = user;
}

const form = document.getElementById("username");
form.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(form);
  let username = data.get("user");
  localStorage.user = username;
  user = username;
  load_stats();
});
