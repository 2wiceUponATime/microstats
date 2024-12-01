const table = document.getElementById("projects");
let rows = [];

export function project_link(slug, title) {
  const result = document.createElement("a");
  result.innerText = title;
  result.href = `https://microstudio.dev/i/${user}/${slug}`
  return result;
}

export function add_row(title, slug, likes, comments) {
  function add_cell(row, content) {
    if (!(content instanceof HTMLElement)) {
      content = new Text(content);
    }
    const cell = document.createElement("td");
    cell.appendChild(content);
    row.appendChild(cell);
  }

  let row = document.createElement("tr");
  add_cell(row, project_link(slug, title))
  add_cell(row, slug);
  add_cell(row, likes);
  add_cell(row, comments);
  rows.push([title, slug, likes, comments, row]);
}

export function reset() {
  rows = [];
}

export function reload() {
  while (table.children.length > 1) {
    table.removeChild(table.children[1]);
  }
  for (const row of rows) {
    table.appendChild(row[4]);
  }
}

export function sort(compare_fn) {
  console.log(rows.sort(compare_fn));
}
