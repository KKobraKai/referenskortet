// Minimal helper for safe localStorage reads.
// Returns { ok: true, value: string|null } on success, or { ok:false } on exception.
export function safeReadSlot(key){
  try{
    return { ok:true, value: localStorage.getItem(key) };
  }catch{
    return { ok:false };
  }
}

