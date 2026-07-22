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

const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');
const startScanBtn = document.getElementById('startScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const scannerVideo = document.getElementById('scannerVideo');
const scanResult = document.getElementById('scanResult');
const openLinkBtn = document.getElementById('openLinkBtn');

const scanCanvas = document.createElement('canvas');
const scanContext = scanCanvas.getContext('2d');

function switchView(viewName){
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.view === viewName));
  views.forEach(view => view.classList.toggle('active', view.classList.contains(`view-${viewName}`)));
  if(viewName === 'scan'){
    scanResult.textContent = 'Point your camera at a QR code to scan it.';
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

let cameraStream = null;
let scanning = false;
let hasBarcodeDetector = 'BarcodeDetector' in window;
let barcodeDetector = null;

async function initScanner(){
  if(scanning) return;

  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    cameraStream = stream;
    scannerVideo.srcObject = stream;
    await scannerVideo.play();
    scanning = true;
    startScanBtn.disabled = true;
    stopScanBtn.disabled = false;
    openLinkBtn.hidden = true;

    if(hasBarcodeDetector){
      const supportedFormats = await BarcodeDetector.getSupportedFormats();
      if(supportedFormats.includes('qr_code')){
        barcodeDetector = new BarcodeDetector({formats:['qr_code']});
      } else {
        barcodeDetector = null;
      }
    }

    scanResult.textContent = 'Scanning for QR code...';
    scanLoop();
  }catch(err){
    scanResult.textContent = 'Unable to access camera: ' + (err.message || err.name);
  }
}

function stopScanner(){
  if(cameraStream){
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  scanning = false;
  scannerVideo.pause();
  scannerVideo.srcObject = null;
  startScanBtn.disabled = false;
  stopScanBtn.disabled = true;
}

function scanVideoFrame(){
  if(scannerVideo.videoWidth === 0 || scannerVideo.videoHeight === 0) return null;
  scanCanvas.width = scannerVideo.videoWidth;
  scanCanvas.height = scannerVideo.videoHeight;
  scanContext.drawImage(scannerVideo, 0, 0, scanCanvas.width, scanCanvas.height);
  return scanContext.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
}

let lastScannedText = null;

function normalizeUrl(text){
  const input = (text || '').trim();
  if(!input) return null;

  try{
    const url = new URL(input);
    if(url.protocol === 'http:' || url.protocol === 'https:'){
      return url.href;
    }
  }catch(_){
    if(/^[\w-]+(\.[\w-]+)+/.test(input)){
      return 'https://' + input;
    }
  }
  return null;
}

function vibrateOnSuccess(){
  if(navigator.vibrate){
    navigator.vibrate(150);
  }
}

function setScanResult(text){
  if(text === lastScannedText) return;
  lastScannedText = text;
  scanResult.textContent = text;
  const url = normalizeUrl(text);
  if(url){
    openLinkBtn.hidden = false;
    openLinkBtn.dataset.url = url;
  } else {
    openLinkBtn.hidden = true;
    delete openLinkBtn.dataset.url;
  }
  vibrateOnSuccess();
}

async function scanLoop(){
  if(!scanning) return;

  try{
    if(barcodeDetector){
      const result = await barcodeDetector.detect(scannerVideo);
      if(result.length){
        setScanResult(result[0].rawValue || 'QR code detected');
      }
    } else {
      const imageData = scanVideoFrame();
      if(imageData){
        const qr = jsQR(imageData.data, imageData.width, imageData.height);
        if(qr){
          setScanResult(qr.data);
        }
      }
    }
  }catch(err){
    scanResult.textContent = 'Scan failed: ' + (err.message || err.name);
    openLinkBtn.hidden = true;
  }

  if(scanning){
    requestAnimationFrame(scanLoop);
  }
}

startScanBtn.addEventListener('click', initScanner);
stopScanBtn.addEventListener('click', stopScanner);
openLinkBtn.addEventListener('click', ()=>{
  const url = openLinkBtn.dataset.url;
  if(url){
    window.open(url, '_blank');
  }
});

urlInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') generateQR(); });

// initial
setPlaceholder();
