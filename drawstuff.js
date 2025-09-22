let currentPart = null;

function runPart(partNum) {
  if(currentPart === 3 && typeof window.part3Stop === 'function') {
    window.part3Stop();
  }
  
  if(partNum === 1 && typeof window.part1Main === 'function') {
    window.part1Main();
  } else if(partNum === 2 && typeof window.part2Main === 'function') {
    window.part2Main();
  } else if(partNum === 3 && typeof window.part3Main === 'function') {
    window.part3Main();
  } else {
    alert(`Part ${partNum} main function not loaded.`);
  }

  currentPart = partNum;
}

function createPartButtons() {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '10px';
  container.style.left = '10px';
  container.style.backgroundColor = 'rgba(255,255,255,0.9)';
  container.style.padding = '10px';
  container.style.borderRadius = '6px';
  container.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
  container.style.display = 'flex';
  container.style.gap = '8px';

  [1, 2, 3].forEach(num => {
    const btn = document.createElement('button');
    btn.textContent = `Part ${num}`;
    btn.onclick = () => runPart(num);
    container.appendChild(btn);
  });

  document.body.appendChild(container);
}

window.addEventListener('DOMContentLoaded', createPartButtons);
