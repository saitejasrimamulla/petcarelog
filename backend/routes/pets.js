const express = require("express");
const supabase = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const { text, date } = require("../utils/validation");
const router = express.Router();
router.use(requireAuth);
const SPECIES = ["Dog","Cat","Bird","Rabbit","Other"];
function validatePet(body) {
  const name = text(body.name,80,true), species = body.species;
  const breed = text(body.breed,80), notes = text(body.notes,1000);
  const dob = date(body.date_of_birth, true);
  const sex = body.sex === "" || body.sex == null ? null : body.sex;
  if (!name || !SPECIES.includes(species) || breed === null || notes === null || dob === undefined || ![null,"Female","Male"].includes(sex)) return null;
  return { name, species, breed: breed || null, notes: notes || null, date_of_birth: dob, sex };
}
router.get("/", async (req,res,next) => {
  try {
    const { data: pets, error } = await supabase.from("pets").select("*").eq("owner_id",req.user.id).order("created_at",{ascending:false});
    if (error) throw error;
    const ids = pets.map(p=>p.id);
    let records = [];
    if (ids.length) {
      const result = await supabase.from("care_records").select("pet_id,next_due_date").in("pet_id",ids);
      if (result.error) throw result.error;
      records = result.data;
    }
    const today = new Date().toISOString().slice(0,10);
    const enriched = pets.map(p => ({...p, record_count:records.filter(r=>r.pet_id===p.id).length, upcoming_count:records.filter(r=>r.pet_id===p.id && r.next_due_date && r.next_due_date>=today).length}));
    res.json({ pets: enriched });
  } catch(e) { next(e); }
});
router.post("/", async (req,res,next) => {
  try {
    const pet = validatePet(req.body);
    if (!pet) return res.status(400).json({error:"Check the pet name, species, date of birth, and optional fields."});
    const {data,error}=await supabase.from("pets").insert({...pet,owner_id:req.user.id}).select("*").single();
    if(error) throw error;
    res.status(201).json({pet:data});
  } catch(e){next(e);}
});
router.patch("/:id", async (req,res,next) => {
  try {
    const pet=validatePet(req.body);
    if(!pet) return res.status(400).json({error:"Check the pet name, species, date of birth, and optional fields."});
    const {data,error}=await supabase.from("pets").update(pet).eq("id",req.params.id).eq("owner_id",req.user.id).select("*").maybeSingle();
    if(error) throw error;
    if(!data) return res.status(404).json({error:"Pet not found."});
    res.json({pet:data});
  } catch(e){next(e);}
});
router.delete("/:id", async (req,res,next) => {
  try {
    const {data,error}=await supabase.from("pets").delete().eq("id",req.params.id).eq("owner_id",req.user.id).select("id").maybeSingle();
    if(error) throw error;
    if(!data) return res.status(404).json({error:"Pet not found."});
    res.json({message:"Pet deleted."});
  } catch(e){next(e);}
});
module.exports=router;
