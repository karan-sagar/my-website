let windowHeight;
let windowWidth;

function updateWindowSize() {
  windowHeight = window.innerHeight;
  windowWidth = window.innerWidth;
}

let dropDownContent = document.querySelector(".dropdown-content");
let fullSizeContent = document.querySelector(".full-size-content");

function windowWidthCheck() {
  updateWindowSize();

  if (windowWidth <= 844) {
    dropDownContent.innerHTML = `
      <a href="#">About</a>
      <a href="#">Experience</a>
      <a href="#">Projects</a>
      <a href="#">Tennis</a>
    `;
  } else {
    fullSizeContent.innerHTML = `
      <li class="nav-bar-item">About</li>
      <li class="nav-bar-item">Experience</li>
      <li class="nav-bar-item">Projects</li>
      <li class="nav-bar-item">Tennis</li>
    `;
  }
}

window.addEventListener("load", windowWidthCheck);
window.addEventListener("resize", windowWidthCheck);


console.log(windowHeight)
