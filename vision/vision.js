window.addEventListener("scroll", () => {
  const hero = document.querySelector(".hero");
  const content = document.querySelector(".content"); // Add this line
  const scrollProgress = Math.min(window.scrollY / 100, 1);

  if (scrollProgress > 0) {
    hero.classList.add("scrolled");
  } else {
    hero.classList.remove("scrolled");
  }
});
