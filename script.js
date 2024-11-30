const socket = new WebSocket("wss://microstudio.dev");
let request_id = 0;
const callbacks = {};

let user = localStorage.user;

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  const id = data.request_id;
  delete data.request_id;
  if (callbacks[id]) {
    callbacks[id](data);
    delete callbacks[id];
  }
}

async function send(data) {
  data.request_id = request_id++;
  socket.send(JSON.stringify(data));
  const result = await new Promise(res => {
    callbacks[data.request_id] = res;
  });
  // console.log(result);
  return result;
}

async function get_projects(user) {
  /*
  const url = "https://microstudio.dev/" + user;
  const res = await fetch(url, {
    mode: "no-cors",
  });
  const text = await res.text();
  console.log(res);
  const doc = new DOMParser().parseFromString(text, "text/html");
  console.log(doc);
  return;
  */
  let projects = [];
  let position = 0;
  let offset = 0;
  while (true) {
    let result = await send({
      name: "get_public_projects",
      ranking: "top",
      type: "all",
      tags: [],
      search: user.toLowerCase(),
      position,
      offset,
    });
    position += 25;
    offset = result.offset;
    projects = projects.concat(result.list);
    if (result.list.length < 25) {
      break;
    }
  }
  projects = projects.filter(project => {
    return project.owner == user;
  });
  return projects;
}

async function load_stats() {
  if (!user) {
    return;
  }

  const table = document.getElementById("projects");
  while (table.length > 1) {
    table.removeChild(table.children[1]);
  }

  function add_cell(tr, content) {
    let cell = document.createElement("td");
    if (content instanceof HTMLElement) {
      cell.appendChild(content);
    } else {
      cell.innerText = content;
    }
    tr.appendChild(cell);
  }

  const user_input = document.getElementById("user");
  document.getElementById("submit").innerText = "Change user"
  user_input.placeholder = user;
  user_input.value = "";

  const projects = await get_projects(user);
  table.style.display = "";

  const project_stats = {};
  const progress = document.getElementById("progress");
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
    const title = stats.title;
    if (!stats) {
      continue;
    }
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

function project_link(slug, title) {
  let result = document.createElement("a");
  result.innerText = title;
  result.href = `https://microstudio.dev/i/${user}/${slug}`
  return result;
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
