(function(){
  "use strict";

  const cfg=window.PAPARAZI_CONFIG||{};
  const supabase=window.supabase&&cfg.supabaseUrl&&cfg.supabasePublishableKey
    ?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey)
    :null;

  window.PAPARAZI={supabase:supabase};

  const $=(s,r=document)=>r.querySelector(s);
  const $=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const emergencyHideSplash=()=>{
    const splash=$(".splash");
    if(!splash)return;
    splash.classList.add("is-hidden");
    splash.style.opacity="0";
    splash.style.visibility="hidden";
    splash.style.pointerEvents="none";
  };
  setTimeout(emergencyHideSplash,1600);

  const esc=(value)=>{
    const map={"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"};
    return String(value??"").replace(/[&<>"']/g,(c)=>map[c]);
  };

  const slugify=(value)=>String(value||"").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90);

  const fmtDate=(value)=>value
    ?new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(new Date(value))
    :"Just in";

  const initials=(name)=>{
    const parts=String(name||"PAPARAZZI").trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0,2).map(x=>x[0]).join("")||"P").toUpperCase();
  };

  function toast(message,tone){
    let t=$(".toast");
    if(!t){t=document.createElement("div");t.className="toast";document.body.appendChild(t);}
    t.textContent=message;
    t.style.background=tone==="error"?"#8e2428":"#111";
    t.classList.add("show");
    clearTimeout(window.__pzToast);
    window.__pzToast=setTimeout(()=>t.classList.remove("show"),3200);
  }

  function setStatus(el,message,kind){
    if(!el)return;
    el.textContent=message;
    el.className="status-box show "+(kind==="error"?"error":kind==="ok"?"ok":"");
  }

  async function currentSession(){
    if(!supabase)return null;
    const r=await supabase.auth.getSession();
    return r.data?.session||null;
  }

  async function ensureProfile(user){
    if(!supabase||!user)return null;
    const existing=await supabase.from("paparazi_profiles").select("*").eq("id",user.id).maybeSingle();
    if(existing.data)return existing.data;

    const label=(user.email||"paparazzi").split("@")[0].replace(/[._-]+/g," ").trim()||"Paparazzi";
    const base=slugify(label).replace(/-/g,"").slice(0,24)||"paparazzi";
    let username=base;
    const taken=await supabase.from("paparazi_profiles").select("id").eq("username",username).maybeSingle();
    if(taken.data)username=base.slice(0,18)+Math.random().toString(36).slice(2,6);

    const inserted=await supabase.from("paparazi_profiles")
      .insert({id:user.id,username,display_name:label.replace(/\b\w/g,c=>c.toUpperCase())})
      .select().single();

    return inserted.error?null:inserted.data;
  }

  function renderNav(session,profile){
    const account=$("#nav-account");
    if(!account)return;
    if(session){
      account.textContent=profile?.is_paparazzi?"STUDIO":"BECOME PAPARAZZI";
      account.href="studio.html";
    }else{
      account.textContent="SIGN IN";
      account.href="join.html";
    }
  }

  async function initShell(){
    const splash=$(".splash");
    if(splash){
      const hide=()=>{
        splash.classList.add("is-hidden");
        try{sessionStorage.setItem("paparazzi_splash_seen","1");}catch(_){}
      };
      let seen=false;
      try{seen=sessionStorage.getItem("paparazzi_splash_seen")==="1";}catch(_){}
      if(seen)hide();
      else setTimeout(hide,1050);
      window.addEventListener("pageshow",()=>setTimeout(hide,1200),{once:true});
    }

    const menu=$("#menu-btn"),mobile=$("#mobile-nav");
    if(menu&&mobile)menu.addEventListener("click",()=>mobile.classList.toggle("is-open"));

    const session=await currentSession();
    const profile=session?await ensureProfile(session.user):null;
    renderNav(session,profile);

    if(supabase){
      supabase.auth.onAuthStateChange(async(_event,next)=>{
        const p=next?await ensureProfile(next.user):null;
        renderNav(next,p);
      });
    }

    window.addEventListener("offline",()=>toast("You're offline. The tip line needs a connection.","error"));
  }

  const seed={
    slug:"welcome-to-paparazzi",
    title:"Welcome to PAPARAZZI🇬🇲",
    category:"Inside PAPARAZZI",
    excerpt:"A new home for the people, places, parties and moments that make The Gambia impossible to ignore.",
    body:"The brief was simple: make a place that feels like The Gambia, not a recycled media template with a flag pasted on top.\n\nPAPARAZZI is built around the moments people actually talk about — the entrance nobody expected, the outfit everybody noticed, the street corner where a story starts, the event that had everybody outside.\n\nThe newsroom will mix staff-written stories with contributions from the community. Anyone can send a tip. Registered readers can become PAPARAZZI contributors and publish their own stories.\n\nThe rule is equally simple: be interesting, be accurate, and don't publish somebody else's private life just because you can.\n\nThis is the first page. The rest will be written with you.",
    author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"}
  };

  async function fetchStories(limit=8){
    if(!supabase)return {data:[],error:null};
    const r=await supabase.from("paparazi_articles")
      .select("id,title,slug,excerpt,body,cover_url,category,status,created_at,published_at,paparazi_profiles(display_name,username,avatar_url)")
      .eq("status","published").order("published_at",{ascending:false}).limit(limit);
    return {data:r.data||[],error:r.error};
  }

  function storyCard(story,index){
    const author=story.paparazi_profiles?.display_name||"PAPARAZZI🇬🇲";
    return "<article class='story-card'><a href='story.html?slug="+encodeURIComponent(story.slug)+"'><div class='story-card-art'><span class='story-card-tag'>"+
      esc(story.category||"Story")+"</span><span class='num'>"+String(index+1).padStart(2,"0")+
      "</span></div><div class='story-card-body'><h3>"+esc(story.title)+"</h3><p>"+
      esc(story.excerpt||(story.body||"").slice(0,150))+"</p><div class='meta'><strong>"+
      esc(author)+"</strong><span>•</span><span>"+fmtDate(story.published_at||story.created_at)+
      "</span></div></div></a></article>";
  }

  async function initHome(){
    if(!$("#featured-title"))return;
    const r=await fetchStories(8);
    const stories=r.data.length?r.data:[{
      ...seed,
      published_at:new Date().toISOString(),
      created_at:new Date().toISOString(),
      paparazi_profiles:seed.author
    }];
    const featured=stories[0];
    $("#featured-kicker").textContent=featured.category||"Featured";
    $("#featured-title").textContent=featured.title;
    $("#featured-excerpt").textContent=featured.excerpt||"";
    $("#featured-meta").innerHTML="<strong>"+esc(featured.paparazi_profiles?.display_name||"PAPARAZZI🇬🇲")+
      "</strong><span>•</span><span>"+fmtDate(featured.published_at||featured.created_at)+"</span>";
    $("#featured-link").href="story.html?slug="+encodeURIComponent(featured.slug);
    $("#featured-art-title").textContent=featured.title;
    $("#story-grid").innerHTML=stories.slice(1).map(storyCard).join("")||
      "<div class='empty-state' style='grid-column:1/-1'><h3>The newsroom is warming up.</h3><p>Be the first person to put something worth talking about on the page.</p></div>";
  }

  async function initStory(){
    const root=$("#story-root");
    if(!root)return;
    const slug=new URLSearchParams(location.search).get("slug")||"welcome-to-paparazzi";
    let story=null;

    if(supabase){
      const r=await supabase.from("paparazi_articles")
        .select("id,title,slug,excerpt,body,cover_url,category,status,created_at,published_at,paparazi_profiles(display_name,username,avatar_url)")
        .eq("slug",slug).eq("status","published").maybeSingle();
      story=r.data;
    }
    if(!story&&slug===seed.slug)story=seed;

    if(!story){
      root.innerHTML="<div class='container'><div class='empty-state' style='margin:60px 0'><h3>That story has left the timeline.</h3><p>Try the latest stories instead.</p><a class='btn btn-dark' href='index.html'>Back home</a></div></div>";
      return;
    }

    const author=story.paparazi_profiles||story.author||{};
    const body=String(story.body||"").split(/\n\s*\n/).map(p=>"<p>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("");
    root.innerHTML="<div class='container story-reader'><div class='story-reader-head'><div class='kicker'>"+
      esc(story.category||"Story")+"</div><h1>"+esc(story.title)+"</h1><p class='story-dek'>"+
      esc(story.excerpt||"")+"</p><div class='meta' style='margin-top:18px'><strong>"+
      esc(author.display_name||"PAPARAZZI🇬🇲")+"</strong><span>•</span><span>"+
      fmtDate(story.published_at||story.created_at)+"</span></div></div><div class='story-cover'><div class='cover-inner'><div class='cover-words'>"+
      esc(story.title)+"</div></div></div><div class='story-body'>"+body+"</div><div class='author-box'><div class='avatar'>"+
      esc(initials(author.display_name||"PAPARAZZI"))+"</div><div><strong>"+esc(author.display_name||"PAPARAZZI🇬🇲")+
      "</strong><div style='color:#7f786f;font-size:.82rem'>@"+esc(author.username||"paparazzigambia")+
      " · PAPARAZZI newsroom</div></div></div></div>";
    document.title=story.title+" — PAPARAZZI🇬🇲";
  }

  async function initJoin(){
    const signIn=$("#sign-in-form"),signUp=$("#sign-up-form");
    if(!signIn||!signUp)return;

    const tabs=$$(".switcher button");
    const setMode=(mode)=>{
      tabs.forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
      signIn.style.display=mode==="signin"?"":"none";
      signUp.style.display=mode==="signup"?"":"none";
    };
    tabs.forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));
    setMode("signin");

    if(!supabase){
      setStatus($("#sign-in-status"),"Account services are temporarily unavailable.","error");
      return;
    }

    signIn.addEventListener("submit",async e=>{
      e.preventDefault();
      const box=$("#sign-in-status");
      const r=await supabase.auth.signInWithPassword({
        email:$("#signin-email").value.trim(),
        password:$("#signin-password").value
      });
      if(r.error){setStatus(box,r.error.message.includes("Invalid login")?"That email or password didn't match. Try again.":r.error.message,"error");return;}
      setStatus(box,"You're in. Taking you to the newsroom…","ok");
      setTimeout(()=>location.href="studio.html",450);
    });

    signUp.addEventListener("submit",async e=>{
      e.preventDefault();
      const box=$("#sign-up-status");
      const name=$("#signup-name").value.trim();
      const email=$("#signup-email").value.trim();
      const password=$("#signup-password").value;
      if(password!==$("#signup-confirm").value){setStatus(box,"Your passwords don't match yet.","error");return;}
      if(password.length<8){setStatus(box,"Use at least 8 characters for the password.","error");return;}

      const r=await supabase.auth.signUp({email,password});
      if(r.error){setStatus(box,r.error.message,"error");return;}
      if(r.data.user&&Array.isArray(r.data.user.identities)&&r.data.user.identities.length===0){
        setStatus(box,"That account already exists. Sign in instead.","error");return;
      }

      if(r.data.session){
        const p=await ensureProfile(r.data.user);
        if(p&&name&&p.display_name!==name)await supabase.from("paparazi_profiles").update({display_name:name}).eq("id",r.data.user.id);
        setStatus(box,"Account created. Welcome to PAPARAZZI.","ok");
        setTimeout(()=>location.href="studio.html",500);
      }else{
        setStatus(box,"Account created. Check your email to confirm it, then come back and sign in.","ok");
      }
    });

    $("#reset-password").addEventListener("click",async()=>{
      const email=$("#signin-email").value.trim();
      const box=$("#sign-in-status");
      if(!email){setStatus(box,"Enter your email first, then tap forgot password.","error");return;}
      const r=await supabase.auth.resetPasswordForEmail(email);
      setStatus(box,r.error?r.error.message:"Password reset instructions have been sent to your email.",r.error?"error":"ok");
    });
  }

  async function loadMyArticles(uid){
    const box=$("#my-articles");
    if(!box||!supabase)return;
    const r=await supabase.from("paparazi_articles").select("*").eq("author_id",uid).order("created_at",{ascending:false}).limit(20);
    if(r.error||!r.data?.length){
      box.innerHTML="<div class='empty-state'><h3>Your first story is still waiting.</h3><p>Write something only someone on the ground would know.</p></div>";
      return;
    }
    box.innerHTML=r.data.map(item=>"<div class='article-item'><div><strong>"+esc(item.title)+
      "</strong><div class='meta' style='margin-top:5px'><span>"+esc(item.category)+
      "</span><span>•</span><span>"+fmtDate(item.created_at)+"</span></div></div><span class='status "+
      esc(item.status)+"'>"+esc(item.status)+"</span></div>").join("");
  }

  async function initStudio(){
    const gate=$("#studio-gate"),app=$("#studio-app");
    if(!gate||!app)return;
    const session=await currentSession();

    if(!session){
      gate.style.display="";
      app.style.display="none";
      return;
    }

    gate.style.display="none";
    app.style.display="";
    const user=session.user;
    let profile=await ensureProfile(user);

    $("#studio-name").textContent=profile?.display_name||user.email||"PAPARAZZI";
    $("#studio-handle").textContent="@"+(profile?.username||"new-paparazzi");
    $("#studio-avatar").textContent=initials(profile?.display_name||user.email||"P");
    $("#paparazzi-status").textContent=profile?.is_paparazzi?"PAPARAZZI contributor":"Reader";

    const joinBtn=$("#become-paparazzi");
    joinBtn.textContent=profile?.is_paparazzi?"You're a PAPARAZZI ✓":"Become a PAPARAZZI";
    joinBtn.disabled=!!profile?.is_paparazzi;

    joinBtn.onclick=async()=>{
      const r=await supabase.from("paparazi_profiles").update({is_paparazzi:true}).eq("id",user.id);
      if(r.error){toast(r.error.message,"error");return;}
      profile={...profile,is_paparazzi:true};
      $("#paparazzi-status").textContent="PAPARAZZI contributor";
      joinBtn.textContent="You're a PAPARAZZI ✓";
      joinBtn.disabled=true;
      toast("Welcome to the newsroom.");
    };

    $("#sign-out").addEventListener("click",async()=>{await supabase.auth.signOut();location.href="index.html";});

    $("#article-form").addEventListener("submit",async e=>{
      e.preventDefault();
      if(!profile?.is_paparazzi){toast("Join the PAPARAZZI contributor crew first.","error");return;}
      const title=$("#article-title").value.trim();
      const category=$("#article-category").value;
      const excerpt=$("#article-excerpt").value.trim();
      const body=$("#article-body").value.trim();
      const cover=$("#article-cover").value.trim()||null;

      if(body.length<20){toast("Give the story a little more room to breathe.","error");return;}

      let slug=slugify(title)||"story";
      const same=await supabase.from("paparazi_articles").select("id").eq("slug",slug).maybeSingle();
      if(same.data)slug=slug+"-"+Math.random().toString(36).slice(2,7);

      const r=await supabase.from("paparazi_articles").insert({
        author_id:user.id,title,slug,excerpt,body,cover_url:cover,category,status:"published"
      });

      if(r.error){toast(r.error.message,"error");return;}
      $("#article-form").reset();
      toast("Published. Now go tell the timeline.");
      loadMyArticles(user.id);
    });

    loadMyArticles(user.id);
  }

  async function initSubmit(){
    const form=$("#tip-form");
    if(!form)return;

    const anonymous=$("#tip-anonymous"),identity=$("#tip-identity");
    const sync=()=>identity.style.display=anonymous.checked?"none":"grid";
    anonymous.addEventListener("change",sync);
    sync();

    form.addEventListener("submit",async e=>{
      e.preventDefault();
      if($("#website-check").value)return;
      if(!supabase){setStatus($("#tip-status"),"The tip line is temporarily unavailable.","error");return;}

      const session=await currentSession();
      const payload={
        submitter_user_id:anonymous.checked?null:(session?.user?.id||null),
        is_anonymous:anonymous.checked,
        submitter_name:anonymous.checked?null:$("#tip-name").value.trim(),
        submitter_email:anonymous.checked?null:$("#tip-email").value.trim(),
        category:$("#tip-category").value,
        title:$("#tip-title").value.trim()||null,
        story:$("#tip-story").value.trim(),
        location:$("#tip-location").value.trim()||null,
        media_url:$("#tip-media").value.trim()||null
      };

      if(payload.story.length<10){setStatus($("#tip-status"),"Tell us what happened first.","error");return;}

      const r=await supabase.from("paparazi_submissions").insert(payload).select("id").single();
      if(r.error){setStatus($("#tip-status"),r.error.message,"error");return;}

      form.reset();
      anonymous.checked=true;
      sync();
      setStatus($("#tip-status"),"Tip received. Keep this reference: "+(r.data?.id?String(r.data.id).slice(0,8).toUpperCase():"RECEIVED")+".","ok");
    });
  }

  document.addEventListener("DOMContentLoaded",async()=>{
    emergencyHideSplash();
    try{
      
      await initShell();
      const page=document.body.dataset.page;
      if(page==="home")await initHome();
      if(page==="story")await initStory();
      if(page==="join")await initJoin();
      if(page==="studio")await initStudio();
      if(page==="submit")await initSubmit();
    }catch(error){
      console.error("PAPARAZZI startup error:",error);
      const splash=$(".splash");
      if(splash)splash.classList.add("is-hidden");
      toast("PAPARAZZI loaded with a temporary service issue.","error");
    }
  });
})();