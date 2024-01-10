const express=require("express")
const router=express.Router();
const BusinessDatabase=require('../models/BusinessDatabase');
const {isLoggedIn}=require("../middleware");
const User=require("../models/User");
const FootPrintDb=require("../models/FootprintDb");
const VehicleDb=require("../models/VehicleDb");
const EmissionFactor=require("../models/EmissionFactor");


router.get("/dashboard",isLoggedIn,async(req,res)=>{
    const user=req.session.passport.user;
    console.log(user);
    const results=await BusinessDatabase.findOne({user:user});
    let id;
    let CarbonEmission;
    let Bname;
    if(results){
        id=results._id;
        CarbonEmission=results.Result;
        Bname=results.name;

    }
    res.render("dashResult/dashboard",{Bname,id,CarbonEmission});
})


router.get("/home",isLoggedIn,(req,res)=>{
    res.render("homePage/index");
})

router.get("/FillForm",isLoggedIn,(req,res)=>{
    if(req.session.Bid){
        return res.redirect(`/BuildingDb/${req.session.Bid}`);
    }
    res.render("homePage/buisenessForm");
})
router.get("/Contact",isLoggedIn,(req,res)=>{
    res.render("homePage/ContactPage");
})


router.post("/BusinessDb",isLoggedIn,async(req,res)=>{
    const user=req.session.passport.user;
    console.log(user);
    const {Bname,Industry,NoOfEmployees,WFHpercent}=req.body;
    let Result=0;
    await BusinessDatabase.create({user,Bname,Industry,NoOfEmployees,WFHpercent,Result});
    const Bdetails=await BusinessDatabase.findOne({Bname:Bname});
    req.session.Bid = Bdetails._id;
    await req.session.save();
    console.log(req.session.Bid);
    req.flash("Your Business Details are added Successfully");
    res.redirect(`/BuildingDb/${Bdetails._id}`);
})
router.get("/Result/:businessid",isLoggedIn,async(req,res)=>{
    const {businessid}=req.params;
    const Business=await BusinessDatabase.findById(businessid);
    let value=parseInt(Business.Result);
    value=parseInt(value/1000);
    const id1 = Business.Carbondatabase_B;
    const id2 = Business.Carbondatabase_V;
    const FootprintDatabase = await FootPrintDb.findById(id1);
    const VehicleDatabase = await VehicleDb.findById(id2);
    const electricity = (FootprintDatabase.electricity*(0.82))/1000;
    // const Electric_v = 2000;
    const naturalGas = (FootprintDatabase.naturalGas*(2.75))/1000;
    const heatingOil = (FootprintDatabase.heatingOil*(3.15))/1000;
    const coal = (FootprintDatabase.coal*(3300))/1000;
    const lpg = (FootprintDatabase.lpg*(2.99))/1000;
    const propane = (FootprintDatabase.propane*(2.99))/1000;
    const diesel = (FootprintDatabase.diesel*(2.7*0.84))/1000;
    const diesel_v = (VehicleDatabase.diesel*(2.7*0.84))/1000;
    const refrigerant = (FootprintDatabase.refrigerantAmount*(675))/1000;
    const petrol_v = (VehicleDatabase.petrol*(8.78*0.264))/1000;
    const cng_v = (VehicleDatabase.cng*(2.666))/1000;
    const Arr=[electricity,naturalGas,heatingOil,coal,lpg,propane,diesel,diesel_v,refrigerant,petrol_v,cng_v]
    // console.log(value);
    res.render("homePage/Result",{value,businessid,Arr});
})
router.get("/BuildingDb/:businessid",isLoggedIn,(req,res)=>{
    const {businessid}=req.params;

    res.render("homePage/buildingDataInput",{businessid});
})

router.get("/VehicleDb/:businessid",isLoggedIn,async(req,res)=>{
    const {businessid}=req.params;
    res.render("homePage/vehicleDataInput",{businessid});
})
router.get("/SupplyDb/:businessid",isLoggedIn,async(req,res)=>{
    const {businessid}=req.params;
    res.render("homePage/supplyChain",{businessid});
})
router.post("/ProductCF/:businessid", isLoggedIn, async (req, res) => {
    const { businessid } = req.params;
    const Obj=req.body;
    console.log(Obj);
    let value=0;
    for (let key in Obj) {
        if(key=='coalProduced'){
            value+=(Obj[key]*1987);

        }
        if(key=='smallCars'){
            value+=(Obj[key]*5000);
        }
        if(key=='midSizeCars'){
            value+=(Obj[key]*8000);
            
        }
        if(key=='largeSUVs'){
            value+=(Obj[key]*11000);
            
        }
        if(key=='electricVehicles'){
            value+=(Obj[key]*9000);
            
        }
        
    }
    console.log(value);
    await BusinessDatabase.findByIdAndUpdate(businessid,{Average:value});
    res.redirect(`/Result/${businessid}`);

})

router.post("/calulateCF/:businessid",isLoggedIn,async(req,res)=>{
    const {businessid}=req.params;
    const {electricity,naturalGas,heatingOil,coal,lpg,propane,diesel,refrigerant,refrigerantAmount}=req.body;
    const Arr=["electricity","naturalGas","heatingOil","coal","lpg","propane","diesel"];
    Arr.push(refrigerant);
    const values=[electricity,naturalGas,heatingOil,coal,lpg,propane,diesel,refrigerantAmount];
    const Business=await BusinessDatabase.findById(businessid).populate("Carbondatabase_B");
    const FootprintDatabase=await FootPrintDb.create({electricity,naturalGas,heatingOil,coal,lpg,propane,diesel,refrigerant,refrigerantAmount});
    Business.Carbondatabase_B.push(FootprintDatabase);
    await Business.save();
    //Saving Result
    const Bus=await BusinessDatabase.findById(businessid);
    const val=Bus.Result;
    let sum=parseInt(val);
    for(let i=0;i<8;i++){
        const emissionDb=await EmissionFactor.findOne({entityName:`${Arr[i]}`}).exec();
        console.log(emissionDb);
        const Ef=emissionDb.emissionFactor;
        console.log(values[i]);
        sum+=(Ef*values[i]);
        console.log(sum);
    }
    await BusinessDatabase.findByIdAndUpdate(businessid,{Result:sum});
    res.redirect(`/VehicleDb/${businessid}`);  
})

router.post("/CalculateFinal/:businessid",isLoggedIn,async(req,res)=>{
    const {businessid}=req.params;
    const{petrol,diesel,cng,lpg}=req.body;
    const Arr=["petrol","diesel","cng","lpg"];
    const values=[petrol,diesel,cng,lpg];

    //Saving Database
    const Business=await BusinessDatabase.findById(businessid).populate("Carbondatabase_V");
    const VehicleDatabase=await VehicleDb.create({petrol,diesel,cng,lpg});
    Business.Carbondatabase_V.push(VehicleDatabase);
    await Business.save();
    //Saving Result
    const Bus=await BusinessDatabase.findById(businessid);
    const val=Bus.Result;
    let sum=parseInt(val);
    for(let i=0;i<4;i++){
        const emissionDb=await EmissionFactor.findOne({entityName:`${Arr[i]}`}).exec();
        console.log(emissionDb);
        const Ef=emissionDb.emissionFactor;
        if(i==0){
            values[i]*=0.264;
        }
        if(i==1){
            values[i]*=0.84;
        }
        sum+=(Ef*values[i]);
        console.log(sum);
    }
    await BusinessDatabase.findByIdAndUpdate(businessid,{Result:sum});
    res.redirect(`/SupplyDb/${businessid}`); 
    
})

module.exports=router

