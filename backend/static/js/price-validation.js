const minInput = document.getElementById('minPrice');
const maxInput = document.getElementById('maxPrice');

function showNotification(message) {
  alert(message);
}

minInput.addEventListener('input', () => {
  let min = parseFloat(minInput.value);
  let max = parseFloat(maxInput.value);

  // Clamp negatives
  if (!isNaN(min) && min < 0) {
    minInput.value = 0;
    min = 0;
  }

  // Enforce min < max when both present
  if (maxInput.value !== '' && !isNaN(min) && !isNaN(max) && min >= max) {
    showNotification('Minimum price must be less than maximum price!');
    minInput.value = Math.max(0, max - 1);
  }
});

maxInput.addEventListener('input', () => {
  let min = parseFloat(minInput.value);
  let max = parseFloat(maxInput.value);

  // Clamp negatives
  if (!isNaN(max) && max < 0) {
    maxInput.value = 0;
    max = 0;
  }

  // Enforce max > min when both present
  if (minInput.value !== '' && !isNaN(min) && !isNaN(max) && max <= min) {
    showNotification('Maximum price must be greater than minimum price!');
    maxInput.value = min + 1;
  }
});