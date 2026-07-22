const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } = require('electron');
const path=require('path'), fs=require('fs');
let activeControllers=new Set(), localRecords=[];
app.setName('ChemSearch');
function resolveAppIcon(){
  const candidates=[
    path.join(__dirname,'assets','ChemSearch.png'),
    path.join(__dirname,'assets','icon.png'),
    path.join(__dirname,'ChemSearch.png'),
    path.join(__dirname,'icon.png')
  ];
  return candidates.find(p=>fs.existsSync(p));
}

function createWindow(){
  const iconPath=resolveAppIcon();
  const w=new BrowserWindow({
    title:'ChemSearch',
    width:1620,
    height:1000,
    minWidth:1120,
    minHeight:720,
    backgroundColor:'#f8fcfc',
    autoHideMenuBar:true,
    ...(iconPath?{icon:iconPath}:{}),
    webPreferences:{
      preload:path.join(__dirname,'preload.js'),
      contextIsolation:true,
      nodeIntegration:false
    }
  });

  w.loadFile(path.join(__dirname,'index.html'));

  w.webContents.on('did-finish-load',async()=>{
    w.setTitle('ChemSearch');
    await w.webContents.insertCSS(`
      :root{
        --chem-accent:#24b7b2;
        --chem-accent-dark:#159b97;
        --chem-bg:#f7fbfb;
        --chem-surface:#ffffff;
        --chem-border:#cfdcdd;
        --chem-text:#173538;
        --chem-muted:#61787a;
        --chem-control-height:36px;
        --chem-radius:10px;
        font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif;
      }

      html,body{
        background:var(--chem-bg)!important;
        color:var(--chem-text)!important;
        font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif!important;
      }

      button,input,select,textarea{
        font:inherit!important;
        box-sizing:border-box!important;
      }

      button,
      input:not([type="checkbox"]):not([type="radio"]),
      select{
        min-height:var(--chem-control-height)!important;
        height:var(--chem-control-height)!important;
        border-radius:var(--chem-radius)!important;
        border:1px solid var(--chem-border)!important;
        vertical-align:middle!important;
      }

      input:not([type="checkbox"]):not([type="radio"]),
      select,
      textarea{
        background:var(--chem-surface)!important;
        color:var(--chem-text)!important;
        padding:0 11px!important;
        outline:none!important;
      }

      textarea{
        border-radius:var(--chem-radius)!important;
        border:1px solid var(--chem-border)!important;
        padding:10px 11px!important;
      }

      input:focus,select:focus,textarea:focus{
        border-color:var(--chem-accent)!important;
        box-shadow:0 0 0 3px rgba(36,183,178,.16)!important;
      }

      button{
        padding:0 15px!important;
        background:#ffffff!important;
        color:var(--chem-text)!important;
        cursor:pointer!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:7px!important;
      }

      button:hover{
        border-color:var(--chem-accent)!important;
        background:#eefafa!important;
      }

      button.primary,
      button[type="submit"],
      .primary-button,
      .btn-primary{
        background:var(--chem-accent)!important;
        border-color:var(--chem-accent)!important;
        color:#ffffff!important;
      }

      button.primary:hover,
      button[type="submit"]:hover,
      .primary-button:hover,
      .btn-primary:hover{
        background:var(--chem-accent-dark)!important;
        border-color:var(--chem-accent-dark)!important;
      }

      label:has(input[type="checkbox"]),
      .checkbox-row,
      .checkbox-item,
      .source-option{
        min-height:var(--chem-control-height)!important;
        display:inline-flex!important;
        align-items:center!important;
        gap:9px!important;
        padding:0 11px!important;
        border:1px solid var(--chem-border)!important;
        border-radius:var(--chem-radius)!important;
        background:#ffffff!important;
        line-height:1!important;
        vertical-align:middle!important;
      }

      input[type="checkbox"]{
        appearance:none!important;
        -webkit-appearance:none!important;
        width:18px!important;
        height:18px!important;
        min-width:18px!important;
        margin:0!important;
        border:1.5px solid #8ea5a7!important;
        border-radius:5px!important;
        background:#ffffff!important;
        display:inline-grid!important;
        place-content:center!important;
        vertical-align:middle!important;
      }

      input[type="checkbox"]::before{
        content:""!important;
        width:9px!important;
        height:5px!important;
        border-left:2px solid #ffffff!important;
        border-bottom:2px solid #ffffff!important;
        transform:rotate(-45deg) scale(0)!important;
        transform-origin:center!important;
      }

      input[type="checkbox"]:checked{
        background:var(--chem-accent)!important;
        border-color:var(--chem-accent)!important;
      }

      input[type="checkbox"]:checked::before{
        transform:rotate(-45deg) scale(1)!important;
      }

      input[type="checkbox"]:focus-visible{
        box-shadow:0 0 0 3px rgba(36,183,178,.18)!important;
      }

      fieldset,
      .panel,
      .card,
      .section{
        border-radius:12px!important;
        border-color:var(--chem-border)!important;
      }

      h1,h2,h3,h4,strong{
        font-family:"Segoe UI Variable Display","Segoe UI Variable","Segoe UI",Arial,sans-serif!important;
      }
    `);
  });
}
app.whenReady().then(createWindow);app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
const settingsPath=()=>path.join(app.getPath('userData'),'settings.bin');
async function timeoutFetch(url,opts={},timeout=25000){
  const c=new AbortController(); activeControllers.add(c); const t=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(url,{...opts,signal:c.signal,headers:{'User-Agent':'ChemSearch/2.2 (contact: local desktop application)','Accept':'application/json,text/plain,*/*',...(opts.headers||{})}});
    const ct=r.headers.get('content-type')||'';
    const body=ct.includes('json')?await r.json():await r.text();
    if(!r.ok){
      const detail=typeof body==='string'?body:(body?.Fault?.Message||body?.Fault?.Details?.[0]||body?.message||body?.error||'');
      const err=new Error(`${r.status} ${r.statusText}${detail?` - ${String(detail).replace(/\s+/g,' ').slice(0,300)}`:''}`);
      err.status=r.status; err.body=body; throw err;
    }
    return body;
  }finally{clearTimeout(t);activeControllers.delete(c);}
}
const add=(a,source,kind,title,url,data={})=>a.push({source,kind,title,url,...data});
function dedupe(a){const seen=new Set();return a.filter(r=>{const k=String(r.inchikey||r.doi||r.pmid||r.id||r.url||`${r.source}|${r.title}`).toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});}
function looksLikeInchiKey(q){return /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i.test(String(q).trim());}
function looksLikeInchi(q){return /^InChI=/i.test(String(q).trim());}
function looksLikeCid(q){return /^CID\s*[:#-]?\s*\d+$/i.test(String(q).trim())||/^\d+$/.test(String(q).trim());}
function cidValue(q){const m=String(q).match(/\d+/);return m?m[0]:String(q).trim();}
function looksLikeSmiles(q){
  const v=String(q).trim();
  if(!v||looksLikeInchi(v)||looksLikeInchiKey(v)||looksLikeCid(v))return false;
  if(/\s/.test(v)||/^\d{2,7}-\d{2}-\d$/.test(v))return false;
  if(/[\[\]().=#@+\\/]/.test(v))return true;
  return /^(?:Br|Cl|Si|Na|Li|Mg|Al|Ca|Fe|Zn|Cu|Mn|[BCNOFPSIKHbcno ps0-9@+\-\[\]\(\)=#\\/.])+$/.test(v.replace(/ /g,''));
}
async function pubchemIds(q,mode){
  const value=String(q||'').trim(); if(!value)return [];
  const post=async(endpoint,field,params='')=>{
    const route=[endpoint,field].filter(Boolean).join('/');
    const data=await timeoutFetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${route}/cids/JSON${params}`,{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:`${field}=${encodeURIComponent(value)}`
    },45000);
    return data.IdentifierList?.CID||[];
  };
  try{
    if(mode==='Substructure')return await post('fastsubstructure','smiles','?MaxRecords=100');
    if(mode==='Similarity')return await post('fastsimilarity_2d','smiles','?Threshold=80&MaxRecords=100');
    if(mode==='Exact structure')return await post('fastidentity','smiles','?identity_type=same_stereo_isotope&MaxRecords=100');
    if(looksLikeCid(value))return [Number(cidValue(value))];
    if(looksLikeInchiKey(value)){
      const data=await timeoutFetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/${encodeURIComponent(value)}/cids/JSON`);return data.IdentifierList?.CID||[];
    }
    if(looksLikeInchi(value))return await post('','inchi');
    if(looksLikeSmiles(value))return await post('','smiles');
    const data=await timeoutFetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(value)}/cids/JSON`);
    return data.IdentifierList?.CID||[];
  }catch(e){
    if(e.status===404)return [];
    throw e;
  }
}
async function pubchem(q,mode,out){
  try{
    const cids=(await pubchemIds(q,mode)).slice(0,100);
    if(!cids.length){add(out,'PubChem','Status','No matching compound found','',{query:q,mode});return;}
    const properties='Title,IUPACName,MolecularFormula,MolecularWeight,ExactMass,MonoisotopicMass,ConnectivitySMILES,SMILES,InChI,InChIKey,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,Complexity,HeavyAtomCount,Charge';
    for(let i=0;i<cids.length;i+=40){
      const batch=cids.slice(i,i+40);
      const p=await timeoutFetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${batch.join(',')}/property/${properties}/JSON`,{},45000);
      for(const x of p.PropertyTable?.Properties||[])add(out,'PubChem','Substance',x.Title||x.IUPACName||`CID ${x.CID}`,`https://pubchem.ncbi.nlm.nih.gov/compound/${x.CID}`,{
        id:`CID ${x.CID}`,cid:x.CID,iupacName:x.IUPACName,formula:x.MolecularFormula,weight:x.MolecularWeight,
        exactMass:x.ExactMass,monoisotopicMass:x.MonoisotopicMass,smiles:x.SMILES||x.ConnectivitySMILES,
        connectivitySmiles:x.ConnectivitySMILES,inchi:x.InChI,inchikey:x.InChIKey,xlogp:x.XLogP,tpsa:x.TPSA,
        hbd:x.HBondDonorCount,hba:x.HBondAcceptorCount,rotatableBonds:x.RotatableBondCount,
        heavyAtoms:x.HeavyAtomCount,charge:x.Charge,complexity:x.Complexity,evidence:'Curated/aggregated PubChem record'
      });
    }
  }catch(e){add(out,'PubChem','Status','Search failed','',{error:e.message,query:q,mode});}
}
async function chembl(q,out){try{const d=await timeoutFetch(`https://www.ebi.ac.uk/chembl/api/data/molecule/search.json?q=${encodeURIComponent(q)}&limit=100`);for(const x of d.molecules||[])add(out,'ChEMBL','Bioactivity',x.pref_name||x.molecule_chembl_id,`https://www.ebi.ac.uk/chembl/explore/compound/${x.molecule_chembl_id}`,{id:x.molecule_chembl_id,formula:x.molecule_properties?.full_molformula,weight:x.molecule_properties?.full_mwt,smiles:x.molecule_structures?.canonical_smiles,inchikey:x.molecule_structures?.standard_inchi_key,maxPhase:x.max_phase,type:x.molecule_type,evidence:'Curated'});}catch(e){add(out,'ChEMBL','Status','Search failed','',{error:e.message});}}
async function chebi(q,out){try{const d=await timeoutFetch(`https://www.ebi.ac.uk/chebi/backend/api/public/compound/?search=${encodeURIComponent(q)}&size=50`);for(const x of d._embedded?.compounds||d.content||[])add(out,'ChEBI','Substance',x.name||x.chebiAsciiName||`CHEBI:${x.id}`,`https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:${x.id}`,{id:`CHEBI:${x.id}`,formula:x.formula,definition:x.definition,evidence:'Curated ontology'});}catch(e){add(out,'ChEBI','Status','Search unavailable','',{error:e.message});}}
async function europepmc(q,out){try{const d=await timeoutFetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&pageSize=100`);for(const x of d.resultList?.result||[])add(out,'Europe PMC','Literature',x.title||x.id,`https://europepmc.org/article/${x.source}/${x.id}`,{id:x.id,pmid:x.pmid,authors:x.authorString,journal:x.journalTitle,year:x.pubYear,doi:x.doi,citations:x.citedByCount,openAccess:x.isOpenAccess,evidence:'Bibliographic'});}catch(e){add(out,'Europe PMC','Status','Search failed','',{error:e.message});}}
async function crossref(q,out){try{const d=await timeoutFetch(`https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=75`);for(const x of d.message?.items||[])add(out,'Crossref','Literature',(x.title||[])[0]||x.DOI,x.URL,{doi:x.DOI,year:x.published?.['date-parts']?.[0]?.[0],journal:(x['container-title']||[])[0],authors:(x.author||[]).map(a=>`${a.given||''} ${a.family||''}`.trim()).join(', '),type:x.type,evidence:'Bibliographic'});}catch(e){add(out,'Crossref','Status','Search failed','',{error:e.message});}}
async function openalex(q,out){try{const d=await timeoutFetch(`https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=75`);for(const x of d.results||[])add(out,'OpenAlex','Literature',x.display_name,x.doi||x.id,{id:x.id,doi:x.doi?.replace('https://doi.org/',''),year:x.publication_year,citations:x.cited_by_count,openAccess:x.open_access?.is_oa,type:x.type,evidence:'Bibliographic'});}catch(e){add(out,'OpenAlex','Status','Search failed','',{error:e.message});}}
async function pubmed(q,out){try{const s=await timeoutFetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q)}&retmode=json&retmax=75`),ids=s.esearchresult?.idlist||[];if(ids.length){const d=await timeoutFetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`);for(const id of ids){const x=d.result?.[id];if(x)add(out,'PubMed','Literature',x.title,`https://pubmed.ncbi.nlm.nih.gov/${id}/`,{pmid:id,authors:(x.authors||[]).map(a=>a.name).join(', '),journal:x.fulljournalname,date:x.pubdate,evidence:'Bibliographic'});}}}catch(e){add(out,'PubMed','Status','Search failed','',{error:e.message});}}
async function rhea(q,out){try{const text=await timeoutFetch(`https://www.rhea-db.org/rhea?query=${encodeURIComponent(q)}&columns=rhea-id,equation,chebi-id,ec&format=tsv&limit=100`);for(const line of String(text).trim().split(/\r?\n/).slice(1)){const c=line.split('\t');if(c[0])add(out,'Rhea','Biochemical reaction',c[1]||c[0],`https://www.rhea-db.org/rhea/${c[0].replace(/\D/g,'')}`,{id:c[0],equation:c[1],participants:c[2],ec:c[3],evidence:'Curated biochemical reaction'});}}catch(e){add(out,'Rhea','Status','Search failed','',{error:e.message});}}
async function uniprot(q,out){try{const d=await timeoutFetch(`https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(q)}&format=json&size=50`);for(const x of d.results||[])add(out,'UniProt','Protein',x.proteinDescription?.recommendedName?.fullName?.value||x.primaryAccession,`https://www.uniprot.org/uniprotkb/${x.primaryAccession}`,{id:x.primaryAccession,organism:x.organism?.scientificName,gene:x.genes?.[0]?.geneName?.value,length:x.sequence?.length,evidence:'Curated protein record'});}catch(e){add(out,'UniProt','Status','Search failed','',{error:e.message});}}
function searchLocal(q){const terms=String(q).toLowerCase().split(/\s+/).filter(Boolean);return localRecords.filter(r=>terms.every(t=>JSON.stringify(r).toLowerCase().includes(t))).slice(0,1000);}
ipcMain.handle('search',async(_,q)=>{const out=[],s=q.sources||{},jobs=[];if(s.pubchem)jobs.push(pubchem(q.query,q.mode,out));if(s.chembl)jobs.push(chembl(q.query,out));if(s.chebi)jobs.push(chebi(q.query,out));if(s.rhea)jobs.push(rhea(q.query,out));if(s.uniprot)jobs.push(uniprot(q.query,out));if(s.europepmc)jobs.push(europepmc(q.query,out));if(s.crossref)jobs.push(crossref(q.query,out));if(s.pubmed)jobs.push(pubmed(q.query,out));if(s.openalex)jobs.push(openalex(q.query,out));await Promise.allSettled(jobs);if(s.local)out.push(...searchLocal(q.query));return dedupe(out);});
ipcMain.handle('cancel-search',()=>{for(const c of activeControllers)c.abort();activeControllers.clear();return true;});
ipcMain.handle('analyze-reaction',(_,rxn)=>{const p=String(rxn).split('>');if(p.length<3)return {ok:false,error:'Expected reactants>agents>products'};const split=x=>x?x.split('.').filter(Boolean):[];const reactants=split(p[0]),agents=split(p[1]),products=split(p[2]);const atoms=x=>(x.match(/[A-Z][a-z]?/g)||[]);const left=atoms(p[0]),right=atoms(p[2]);const counts=a=>a.reduce((o,v)=>(o[v]=(o[v]||0)+1,o),{}),lc=counts(left),rc=counts(right);const imbalance=[...new Set([...Object.keys(lc),...Object.keys(rc)])].filter(k=>lc[k]!==rc[k]).map(k=>`${k}: ${lc[k]||0} → ${rc[k]||0}`);return {ok:true,reactants,agents,products,componentCount:{reactants:reactants.length,agents:agents.length,products:products.length},elementBalance:imbalance.length?imbalance:['No obvious element-count imbalance detected'],classification:products.length>reactants.length?'Fragmentation / multi-product':reactants.length>products.length?'Coupling / condensation':'Transformation',evidence:'Rule-based preliminary analysis; RDKit service optional for atom mapping'};});
ipcMain.handle('retrosynthesis',async(_,x)=>{const s=await loadSettingsInternal();if(!s.retroUrl)throw new Error('No retrosynthesis URL configured.');return timeoutFetch(s.retroUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({smiles:x.smiles,maxDepth:x.maxDepth||5,iterations:x.iterations||100})},120000);});
ipcMain.handle('run-custom-connector',async(_,x)=>{const u=x.url.replaceAll('{query}',encodeURIComponent(x.query));const d=await timeoutFetch(u,{headers:x.apiKey?{'Authorization':`Bearer ${x.apiKey}`}:{}});return d;});
function parseSdf(text,file){const recs=[];for(const block of text.split(/\$\$\$\$/)){const lines=block.trim().split(/\r?\n/);if(!lines[0])continue;const props={};for(let i=0;i<lines.length;i++){const m=lines[i].match(/^>\s*<([^>]+)>/);if(m)props[m[1]]=lines[i+1]||'';}recs.push({source:'Local SDF',kind:'Local substance',title:props.NAME||props.IUPAC_NAME||lines[0],file,formula:props.FORMULA,smiles:props.SMILES,inchikey:props.INCHIKEY,data:props,evidence:'User-provided'});}return recs;}
ipcMain.handle('import-local',async()=>{const r=await dialog.showOpenDialog({properties:['openFile','multiSelections'],filters:[{name:'Chemical data',extensions:['json','csv','sdf','mol','rxn','rdf','txt','jdx','dx']}]});if(r.canceled)return {count:localRecords.length};for(const f of r.filePaths){const ext=path.extname(f).toLowerCase(),text=fs.readFileSync(f,'utf8');try{if(ext==='.json'){const o=JSON.parse(text),arr=Array.isArray(o)?o:[o];localRecords.push(...arr.map((x,i)=>({source:'Local JSON',kind:'Local record',title:x.title||x.name||`Record ${i+1}`,file:f,...x,evidence:'User-provided'})));}else if(ext==='.sdf'||ext==='.rdf')localRecords.push(...parseSdf(text,f));else localRecords.push({source:'Local file',kind:ext==='.jdx'||ext==='.dx'?'Spectrum':'Document',title:path.basename(f),file:f,text:text.slice(0,100000),evidence:'User-provided'});}catch(e){localRecords.push({source:'Local import',kind:'Status',title:path.basename(f),error:e.message,file:f});}}return {count:localRecords.length};});
ipcMain.handle('search-local',(_,q)=>searchLocal(q));
ipcMain.handle('save-project',async(_,data)=>{const r=await dialog.showSaveDialog({defaultPath:'ChemSearch-project.json',filters:[{name:'ChemSearch Project',extensions:['json']}]});if(!r.canceled){fs.writeFileSync(r.filePath,JSON.stringify({...data,localRecords},null,2));return r.filePath;}});
ipcMain.handle('load-project',async()=>{const r=await dialog.showOpenDialog({filters:[{name:'ChemSearch Project',extensions:['json']}],properties:['openFile']});if(!r.canceled){const d=JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));if(Array.isArray(d.localRecords))localRecords=d.localRecords;return d;}});
ipcMain.handle('save-notebook',async(_,x)=>{const r=await dialog.showSaveDialog({defaultPath:'ChemSearch-notebook.md',filters:[{name:'Markdown',extensions:['md']}]});if(!r.canceled){fs.writeFileSync(r.filePath,x);return r.filePath;}});
ipcMain.handle('export',async(_,x)=>{const r=await dialog.showSaveDialog({defaultPath:x.name,filters:[{name:x.type,extensions:[x.ext]}]});if(!r.canceled){fs.writeFileSync(r.filePath,x.content);return r.filePath;}});
function loadSettingsInternal(){try{const b=fs.readFileSync(settingsPath());const text=safeStorage.isEncryptionAvailable()?safeStorage.decryptString(b):b.toString();return JSON.parse(text);}catch{return {};}}
ipcMain.handle('save-settings',(_,s)=>{const raw=Buffer.from(JSON.stringify(s));const out=safeStorage.isEncryptionAvailable()?safeStorage.encryptString(raw.toString()):raw;fs.writeFileSync(settingsPath(),out);return true;});ipcMain.handle('load-settings',()=>loadSettingsInternal());ipcMain.handle('open',(_,u)=>shell.openExternal(u));
