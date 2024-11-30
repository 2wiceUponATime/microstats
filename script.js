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

  const projects = await get_projects(user);
  table.style.display = "";

  document.getElementById("submit").innerText = "Change user"
  document.getElementById("user").placeholder = user;

  for (const project of projects) {
    const row = document.createElement("tr");
    let project_link = document.createElement("a");
    project_link.innerText = project.title;
    project_link.href = `https://microstudio.dev/i/${user}/${project.slug}`
    add_cell(row, project_link);
    add_cell(row, project.slug);
    add_cell(row, project.likes);
    let result = await send({
      name: "get_project_comments",
      project: project.id,
    })
    add_cell(row, result.comments.length);
    table.appendChild(row);
  }
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
