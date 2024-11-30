const socket = new WebSocket("wss://microstudio.dev");
let request_id = 0;
const callbacks = {};

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

socket.onopen = async function() {
  console.log("socket open");
  /*
  await send({
    name: "get_public_project",
    owner: "TwiceUponATime",
    project: "onebit",
  })
  */
  function add_cell(tr, text) {
    let cell = document.createElement("td");
    cell.innerText = text;
    tr.appendChild(cell);
  }

  const projects = await get_projects("gilles");
  const table = document.getElementById("projects");
  for (const project of projects) {
    const row = document.createElement("tr");
    add_cell(row, project.title);
    add_cell(row, project.slug);
    add_cell(row, project.likes);
    add_cell(row, "N/A")
    table.appendChild(row);
  }
}

console.log(socket);
