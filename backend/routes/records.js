const express = require("express");
const supabase = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const { text, date } = require("../utils/validation");
const router = express.Router();
router.use(requireAuth);
const TYPES = ["Vet visit","Vaccination","Medication","Grooming","Feeding","Other"];
function validateRecord(body) {
  const title=text(body.title,120,true), type=body.type, record_date=date(body.record_date), due=date(body.next_due_date,true), details=text(body.details,2000);
  if(!title || !TYPES.includes(type) || record_date===undefined || due===undefined || details===null) return null;
  if(due && due < record_date) return null;
  return {title,type,record_date,next_due_date:due,details:details||null};
}
async function ownedPet(petId,userId) {
  const {data,error}=await supabase.from("pets").select("id").eq("id",petId).eq("owner_id",userId).maybeSingle();
  if(error) throw error; return data;
}
router.get("/pets/:petId/records", async(req,res,next)=>{
  try{
    if(!(await ownedPet(req.params.petId,req.user.id))) return res.status(404).json({error:"Pet not found."});
    const {data,error}=await supabase.from("care_records").select("*").eq("pet_id",req.params.petId).order("record_date",{ascending:false});
    if(error) throw error; res.json({records:data});
  }catch(e){next(e);}
});
router.post("/pets/:petId/records", async(req,res,next)=>{
  try{
    const record=validateRecord(req.body);
    if(!record) return res.status(400).json({error:"Check the title, type, dates, and details. The next due date cannot be before the entry date."});
    if(!(await ownedPet(req.params.petId,req.user.id))) return res.status(404).json({error:"Pet not found."});
    const {data,error}=await supabase.from("care_records").insert({...record,pet_id:req.params.petId}).select("*").single();
    if(error) throw error; res.status(201).json({record:data});
  }catch(e){next(e);}
});
router.patch("/records/:id", async(req,res,next)=>{
  try{
    const record=validateRecord(req.body);
    if(!record) return res.status(400).json({error:"Check the title, type, dates, and details. The next due date cannot be before the entry date."});
    const {data:current,error:readError}=await supabase.from("care_records").select("id,pet_id").eq("id",req.params.id).maybeSingle();
    if(readError) throw readError;
    if(!current || !(await ownedPet(current.pet_id,req.user.id))) return res.status(404).json({error:"Care entry not found."});
    const {data,error}=await supabase.from("care_records").update(record).eq("id",req.params.id).eq("pet_id",current.pet_id).select("*").single();
    if(error) throw error; res.json({record:data});
  }catch(e){next(e);}
});
router.delete("/records/:id", async(req,res,next)=>{
  try{
    const {data:current,error:readError}=await supabase.from("care_records").select("id,pet_id").eq("id",req.params.id).maybeSingle();
    if(readError) throw readError;
    if(!current || !(await ownedPet(current.pet_id,req.user.id))) return res.status(404).json({error:"Care entry not found."});
    const {error}=await supabase.from("care_records").delete().eq("id",req.params.id).eq("pet_id",current.pet_id);
    if(error) throw error; res.json({message:"Care entry deleted."});
  }catch(e){next(e);}
});
module.exports=router;
