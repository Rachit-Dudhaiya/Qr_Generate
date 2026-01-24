const urlInput = document.getElementById('urlInput');
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');
const preview = document.getElementById('preview');
const downloadLink = document.getElementById('downloadLink');

function setPlaceholder(){
  preview.innerHTML = '<span class="placeholder">Your generated QR will appear here.</span>';
  downloadLink.hidden = true;
}

async function generateQR(){
  const value = (urlInput.value || '').trim();
  if(!value){
    urlInput.focus();
    return;
  }

  const encoded = encodeURIComponent(value);
  const size = 300;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;

  // show image preview
  preview.innerHTML = '';
  const img = document.createElement('img');
  img.src = qrUrl;
  img.alt = 'QR code';
  img.onload = ()=>{};
  preview.appendChild(img);

  // create downloadable blob (to support download attribute reliably)
  try{
    const resp = await fetch(qrUrl);
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);
    downloadLink.href = objUrl;
    downloadLink.hidden = false;
  }catch(e){
    // fallback: link directly to generated URL
    downloadLink.href = qrUrl;
    downloadLink.hidden = false;
  }
}

function resetAll(){
  urlInput.value = '';
  setPlaceholder();
}

generateBtn.addEventListener('click', generateQR);
resetBtn.addEventListener('click', resetAll);

urlInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') generateQR(); });

// initial
setPlaceholder();
