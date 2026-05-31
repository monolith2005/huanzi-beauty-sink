const shelf = document.getElementById("sizeShelf");
const rows = document.getElementById("sizeRows");
const toggle = document.getElementById("showAllToggle");

function productGroups() {
  const groups = new Map();
  (window.PRODUCTS || []).forEach((item) => {
    if (!groups.has(item.product)) groups.set(item.product, []);
    groups.get(item.product).push(item);
  });
  return [...groups.values()].sort((a, b) => a[0].worldHeightCm - b[0].worldHeightCm);
}

function renderSizeCheck() {
  const groups = productGroups();
  const items = toggle.checked ? groups.map((group) => group[Math.floor(group.length / 2)]) : groups.flat();

  shelf.innerHTML = items
    .map((item) => `
      <article class="size-item" style="--check-height:${item.displayHeightPx}px">
        <img src="${item.image}" alt="${item.name}" loading="lazy" />
        <div class="size-name">
          <strong>${item.product}</strong>
          <div class="size-meta">${item.worldHeightCm} x ${item.worldWidthCm} cm</div>
        </div>
      </article>
    `)
    .join("");

  rows.innerHTML = groups
    .map((group) => {
      const item = group[Math.floor(group.length / 2)];
      return `
        <tr>
          <td>${item.product}</td>
          <td>${item.worldHeightCm} x ${item.worldWidthCm} cm</td>
          <td>${item.displayHeightPx}px</td>
          <td>${group.length}</td>
        </tr>
      `;
    })
    .join("");
}

toggle.addEventListener("change", renderSizeCheck);
renderSizeCheck();
