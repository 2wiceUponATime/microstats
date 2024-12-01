const callbacks = {};
let request_id = 0;

export const socket = new WebSocket("wss://microstudio.dev");

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  const id = data.request_id;
  delete data.request_id;
  if (callbacks[id]) {
    callbacks[id](data);
    delete callbacks[id];
  }
}

export async function send(data) {
  data.request_id = request_id++;
  socket.send(JSON.stringify(data));
  const result = await new Promise(res => {
    callbacks[data.request_id] = res;
  });
  return result;
}

export async function get_projects(user, callback) {
  let all_projects = [];
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
    let projects = result.list.filter(project => {
      return project.owner == user;
    })
    all_projects = all_projects.concat(projects);
    if (result.list.length < 25) {
      callback(projects, true);
      break;
    }
    callback(projects, false);
  }
  return all_projects;
}
