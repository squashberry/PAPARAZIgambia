(function(){
  "use strict";

  const cfg=window.PAPARAZI_CONFIG||{};
  const supabase=window.supabase&&cfg.supabaseUrl&&cfg.supabasePublishableKey
    ?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey)
    :null;

  window.PAPARAZI={supabase};

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

  const withTimeout=(promise,ms,fallback=null)=>Promise.race([
    promise,
    new Promise(resolve=>setTimeout(()=>resolve(fallback),ms))
  ]);

  const hideSplash=()=>{
    const splash=$(".splash");
    if(!splash)return;
    splash.classList.add("is-hidden");
    splash.style.opacity="0";
    splash.style.visibility="hidden";
    splash.style.pointerEvents="none";
  };

  const esc=value=>{
    const map={"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"};
    return String(value??"").replace(/[&<>"']/g,c=>map[c]);
  };

  const slugify=value=>String(value||"").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90);

  const fmtDate=value=>{
    if(!value)return "Just in";
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return "Just in";
    return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(date);
  };

  const initials=name=>{
    const parts=String(name||"PAPARAZZI").trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0,2).map(x=>x[0]).join("")||"P").toUpperCase();
  };

  function toast(message,tone){
    let t=$(".toast");
    if(!t){
      t=document.createElement("div");
      t.className="toast";
      document.body.appendChild(t);
    }
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

  function storyHref(story){
    if(story?._starter)return "stories/"+encodeURIComponent(story.slug)+".html";
    return "story.html?slug="+encodeURIComponent(story.slug);
  }

  function initMotion(){
    document.documentElement.classList.add("motion-ready");

    $$(".hero-intro, .editorial-hero, .beat-strip .container, .latest-head, .latest-item, .desk-grid, .tip-banner-inner, .page-head, .panel, .story-reader-head, .story-cover, .story-body, .author-box, .story-next").forEach(el=>{
      el.setAttribute("data-reveal","");
    });

    const revealables=$$("[data-reveal]");
    if("IntersectionObserver" in window){
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },{threshold:0.08,rootMargin:"0px 0px -7% 0px"});

      revealables.forEach((el,index)=>{
        el.style.setProperty("--reveal-delay",String(Math.min(index*45,280))+"ms");
        observer.observe(el);
      });
    }else{
      revealables.forEach(el=>el.classList.add("is-visible"));
    }

    $$("a[data-morph], .story-hit, .rail-item, .latest-item, .beat-links a, .brand").forEach(el=>{
      el.addEventListener("click",event=>{
        const href=el.getAttribute("href");
        if(!href||href.startsWith("#")||href.startsWith("mailto:")||el.target==="_blank")return;
        if(!document.startViewTransition)return;
        event.preventDefault();
        document.startViewTransition(()=>{window.location.href=href;});
      });
    });

    window.addEventListener("pageshow",()=>{
      document.body.classList.remove("page-leaving");
      document.body.classList.add("page-ready");
    },{once:true});
  }

  const SITE_ORIGIN="https://squashberry.github.io/PAPARAZZIgambia";
  const TIKTOK_URL="https://www.tiktok.com/@paparazzigambia?lang=en";

  function setMeta(name,value,attribute="name"){
    if(!value)return;
    let meta=document.head.querySelector('meta['+attribute+'="'+name+'"]');
    if(!meta){
      meta=document.createElement("meta");
      meta.setAttribute(attribute,name);
      document.head.appendChild(meta);
    }
    meta.setAttribute("content",String(value));
  }

  function setLink(rel,href){
    let link=document.head.querySelector('link[rel="'+rel+'"]');
    if(!link){
      link=document.createElement("link");
      link.setAttribute("rel",rel);
      document.head.appendChild(link);
    }
    link.setAttribute("href",href);
  }

  function updateSocialMeta({title,description,url,image,type="website",publishedAt=null,modifiedAt=null,author=null,category=null}){
    document.title=title;
    setMeta("description",description);
    setLink("canonical",url);

    setMeta("og:type",type,"property");
    setMeta("og:site_name","PAPARAZZI🇬🇲","property");
    setMeta("og:locale","en_GM","property");
    setMeta("og:title",title,"property");
    setMeta("og:description",description,"property");
    setMeta("og:url",url,"property");
    setMeta("og:image",image,"property");
    setMeta("og:image:alt",title,"property");
    setMeta("og:image:width","1200","property");
    setMeta("og:image:height","630","property");

    setMeta("twitter:card","summary_large_image");
    setMeta("twitter:title",title);
    setMeta("twitter:description",description);
    setMeta("twitter:image",image);

    if(type==="article"){
      if(publishedAt)setMeta("article:published_time",publishedAt,"property");
      if(modifiedAt)setMeta("article:modified_time",modifiedAt,"property");
      if(author)setMeta("article:author",author,"property");
      if(category)setMeta("article:section",category,"property");
    }
  }

  function installArticleSchema(story,author,url,image){
    const existing=document.getElementById("paparazzi-article-schema");
    if(existing)existing.remove();

    const script=document.createElement("script");
    script.type="application/ld+json";
    script.id="paparazzi-article-schema";
    script.textContent=JSON.stringify({
      "@context":"https://schema.org",
      "@graph":[{
      "@type":"NewsArticle",
      headline:story.title,
      description:story.excerpt||String(story.body||"").slice(0,180),
      image:[image],
      datePublished:story.published_at||story.created_at||new Date().toISOString(),
      dateModified:story.updated_at||story.published_at||story.created_at||new Date().toISOString(),
      author:[{"@type":"Person","name":author.display_name||author.username||"PAPARAZZI🇬🇲"}],
      publisher:{
        "@type":"Organization",
        name:"PAPARAZZI🇬🇲",
        url:SITE_ORIGIN+"/",
        sameAs:[TIKTOK_URL],
        logo:{"@type":"ImageObject","url":SITE_ORIGIN+"/favicon.svg"}
      },
      mainEntityOfPage:url,
      url,
      inLanguage:"en-GM",
      articleSection:story.category||"Story",
      isPartOf:{"@type":"WebSite",name:"PAPARAZZI🇬🇲",url:SITE_ORIGIN+"/"}
      },{
        "@type":"BreadcrumbList",
        itemListElement:[
          {"@type":"ListItem","position":1,"name":"PAPARAZZI🇬🇲","item":SITE_ORIGIN+"/"},
          {"@type":"ListItem","position":2,"name":story.category||"Story","item":url},
          {"@type":"ListItem","position":3,"name":story.title,"item":url}
        ]
      }]
    });
    document.head.appendChild(script);
  }

  async function shareContent({title,text,url,imageUrl=null}){
    const data={title,text,url};
    try{
      if(imageUrl&&navigator.share&&navigator.canShare){
        try{
          const response=await fetch(imageUrl,{mode:"cors"});
          if(response.ok){
            const blob=await response.blob();
            const mime=blob.type||"image/jpeg";
            const ext=mime.includes("png")?".png":mime.includes("webp")?".webp":mime.includes("svg")?".svg":".jpg";
            const file=new File([blob],"paparazzi-share"+ext,{type:mime});
            if(navigator.canShare({files:[file]}))data.files=[file];
          }
        }catch(_){}
      }

      if(navigator.share){
        await navigator.share(data);
        return;
      }
    }catch(error){
      if(error?.name==="AbortError")return;
    }

    try{
      await navigator.clipboard.writeText(url);
      toast("Share link copied.");
    }catch(_){
      toast("Copy this page URL to share it.","error");
    }
  }

  async function currentSession(){
    if(!supabase)return null;
    try{
      const result=await withTimeout(supabase.auth.getSession(),3500,null);
      return result?.data?.session||null;
    }catch(_){
      return null;
    }
  }

  async function ensureProfile(user){
    if(!supabase||!user)return null;
    try{
      const existing=await withTimeout(
        supabase.from("paparazi_profiles").select("*").eq("id",user.id).maybeSingle(),
        3500,
        null
      );
      if(existing?.data)return existing.data;

      const label=(user.email||"paparazzi").split("@")[0].replace(/[._-]+/g," ").trim()||"Paparazzi";
      const base=slugify(label).replace(/-/g,"").slice(0,24)||"paparazzi";
      let username=base;

      const taken=await withTimeout(
        supabase.from("paparazi_profiles").select("id").eq("username",username).maybeSingle(),
        3000,
        null
      );
      if(taken?.data)username=base.slice(0,18)+Math.random().toString(36).slice(2,6);

      const inserted=await withTimeout(
        supabase.from("paparazi_profiles")
          .insert({
            id:user.id,
            username,
            display_name:label.replace(/\b\w/g,c=>c.toUpperCase())
          })
          .select()
          .single(),
        4000,
        null
      );

      return inserted?.error?null:inserted?.data||null;
    }catch(_){
      return null;
    }
  }

  const MEDIA_BUCKET="paparazzi-media";
  const TIPS_BUCKET="paparazzi-tips";
  const MAX_FILE_BYTES=50*1024*1024;
  const MEDIA_TYPES=/^(image|video)\//i;

  function fileSize(bytes){
    if(bytes<1024*1024)return Math.max(1,Math.round(bytes/1024))+" KB";
    return (bytes/(1024*1024)).toFixed(1)+" MB";
  }

  function safeFilename(name){
    return String(name||"file")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g,"-")
      .replace(/-+/g,"-")
      .replace(/^-|-$/g,"")
      .slice(0,90)||"file";
  }

  function validateMediaFiles(files,maxCount){
    const list=Array.from(files||[]);
    if(list.length>maxCount)return "Choose up to "+maxCount+" files.";
    const invalid=list.find(file=>!MEDIA_TYPES.test(file.type));
    if(invalid)return invalid.name+" is not an image or video file.";
    const oversized=list.find(file=>file.size>MAX_FILE_BYTES);
    if(oversized)return oversized.name+" is larger than 50 MB.";
    return null;
  }

  function renderSelectedFiles(input,listId,maxCount){
    const list=$(listId);
    if(!list||!input)return;
    const files=Array.from(input.files||[]);
    const error=validateMediaFiles(files,maxCount);
    if(error){
      input.value="";
      list.innerHTML="<div class='upload-error'>"+esc(error)+"</div>";
      return;
    }
    list.innerHTML=files.map((file,index)=>
      "<div class='upload-item'><span class='upload-index'>"+String(index+1).padStart(2,"0")+"</span><div><strong>"+esc(file.name)+"</strong><small>"+esc(file.type||"media")+" · "+fileSize(file.size)+"</small></div></div>"
    ).join("");
  }

  async function uploadMediaFiles(files,bucket,folder,onProgress,makePublic=false){
    if(!supabase)throw new Error("Media storage is temporarily unavailable.");
    const list=Array.from(files||[]);
    const error=validateMediaFiles(list,20);
    if(error)throw new Error(error);
    const uploaded=[];

    for(let i=0;i<list.length;i++){
      const file=list[i];
      const path=folder+"/"+crypto.randomUUID()+"-"+safeFilename(file.name);
      const result=await withTimeout(
        supabase.storage.from(bucket).upload(path,file,{
          cacheControl:"3600",
          contentType:file.type,
          upsert:false
        }),
        90000,
        {error:{message:"The upload timed out. Please try again."}}
      );
      if(result?.error)throw new Error(result.error.message||"Upload failed.");

      const item={path,name:file.name,type:file.type,size:file.size};
      if(makePublic){
        const publicResult=supabase.storage.from(bucket).getPublicUrl(path);
        item.url=publicResult?.data?.publicUrl||null;
        if(!item.url)throw new Error("The uploaded file did not receive a public URL.");
      }

      uploaded.push(item);
      if(onProgress)onProgress(i+1,list.length,file);
    }

    return uploaded;
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

  function initMobileNav(){
    const menu=$("#menu-btn");
    const mobile=$("#mobile-nav");
    if(!menu||!mobile)return;

    const setOpen=open=>{
      mobile.classList.toggle("is-open",open);
      mobile.setAttribute("aria-hidden",String(!open));
      menu.setAttribute("aria-expanded",String(open));
    };

    setOpen(false);
    menu.addEventListener("click",e=>{
      e.stopPropagation();
      setOpen(!mobile.classList.contains("is-open"));
    });
    mobile.addEventListener("click",e=>{
      if(e.target.closest("a"))setOpen(false);
    });
    document.addEventListener("click",e=>{
      if(mobile.classList.contains("is-open")&&!mobile.contains(e.target)&&!menu.contains(e.target))setOpen(false);
    });
  }

  function initShell(){
    hideSplash();
    initMobileNav();

    renderNav(null,null);

    if(supabase){
      currentSession().then(async session=>{
        const profile=session?await ensureProfile(session.user):null;
        renderNav(session,profile);
      }).catch(()=>{});

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

  const starterStories=[
    seed,
    {
      slug:"how-paparazzi-works",
      title:"How PAPARAZZI works",
      category:"Inside PAPARAZZI",
      excerpt:"Tips come in fast. We slow down long enough to check the story, add context and decide what is worth publishing.",
      body:"PAPARAZZI is built for the moments people actually talk about. Community tips are reviewed before publication, and contributors publish under their own byline.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"}
    },
    {
      slug:"become-a-paparazzi",
      title:"Your byline can start here",
      category:"Community",
      excerpt:"Create an account, become a PAPARAZZI contributor and publish stories from the places you know best.",
      body:"The newsroom works better when the people closest to the story can tell it.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"}
    },
    {
      slug:"send-a-tip",
      title:"You saw it. Send the tip.",
      category:"Tip line",
      excerpt:"A photo, a lead, a rumour worth checking or a detail everyone else missed can start a story.",
      body:"Anonymous tips are welcome. We review submissions before anything reaches the front page.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"}
    }
  ];

  async function fetchStories(limit=12){
    if(!supabase)return {data:[],error:null};
    try{
      const result=await withTimeout(
        supabase.from("paparazi_articles")
          .select("id,title,slug,excerpt,body,cover_url,category,status,created_at,published_at,paparazi_profiles(display_name,username,avatar_url)")
          .eq("status","published")
          .order("published_at",{ascending:false,nullsFirst:false})
          .limit(limit),
        4500,
        {data:[],error:{message:"timeout"}}
      );
      return {data:result?.data||[],error:result?.error||null};
    }catch(error){
      return {data:[],error};
    }
  }

  function coverImage(url,alt="",loading="lazy"){
    return url
      ?"<img loading='"+loading+"' referrerpolicy='no-referrer' alt='"+esc(alt)+"' src='"+esc(url)+"' onerror=\"this.remove()\">"
      :"";
  }

  function railItem(story){
    const author=story.paparazi_profiles?.display_name||story.author?.display_name||"PAPARAZZI🇬🇲";
    return "<a class='rail-item' data-morph href='"+storyHref(story)+"'>"
      +"<div class='rail-thumb'>"+coverImage(story.cover_url,story.title)+"</div>"
      +"<div><div class='kicker'>"+esc(story.category||"Story")+"</div>"
      +"<h3>"+esc(story.title)+"</h3>"
      +"<div class='meta'><span>"+esc(author)+"</span><span>•</span><span>"+fmtDate(story.published_at||story.created_at)+"</span></div></div></a>";
  }

  function latestItem(story,index){
    const author=story.paparazi_profiles?.display_name||story.author?.display_name||"PAPARAZZI🇬🇲";
    const variant=[""," alt-a"," alt-b"," alt-c"][index%4];
    return "<a class='latest-item' data-morph href='"+storyHref(story)+"'>"
      +"<span class='latest-index'>"+String(index+1).padStart(2,"0")+"</span>"
      +"<div class='latest-thumb"+variant+"'>"+coverImage(story.cover_url,story.title)+"</div>"
      +"<div class='latest-info'><div class='kicker'>"+esc(story.category||"Story")+"</div>"
      +"<h3>"+esc(story.title)+"</h3>"
      +"<p>"+esc(story.excerpt||(story.body||"").slice(0,170))+"</p>"
      +"<div class='meta' style='margin-top:10px'><strong>"+esc(author)+"</strong><span>•</span><span>"+fmtDate(story.published_at||story.created_at)+"</span></div></div>"
      +"<div class='latest-side'><div class='category'>"+esc(story.category||"Story")+"</div><span class='read'>READ →</span></div></a>";
  }

  async function initHome(){
    if(!$("#lead-title"))return;

    updateSocialMeta({
      title:"PAPARAZZI🇬🇲 — The Gambia's Social Scene",
      description:"The Gambia's people-powered social, entertainment, culture, nightlife and style newsroom.",
      url:SITE_ORIGIN+"/",
      image:SITE_ORIGIN+"/og-image.svg",
      type:"website"
    });

    const shareSite=$("#share-site");
    if(shareSite)shareSite.onclick=()=>shareContent({
      title:"PAPARAZZI🇬🇲",
      text:"The Gambia's social scene, through the PAPARAZZI lens.",
      url:SITE_ORIGIN+"/",
      imageUrl:SITE_ORIGIN+"/og-image.svg"
    });

    const result=await fetchStories(12);
    const usingStarter=!result.data.length;
    const stories=(result.data.length?result.data:starterStories).map((item,index)=>({
      ...item,
      _starter:usingStarter,
      published_at:item.published_at||new Date(Date.now()-(index*86400000)).toISOString(),
      created_at:item.created_at||new Date(Date.now()-(index*86400000)).toISOString(),
      paparazi_profiles:item.paparazi_profiles||item.author
    }));

    const featured=stories[0];
    $("#lead-kicker").textContent=featured.category||"Featured";
    $("#lead-title").textContent=featured.title;
    $("#lead-excerpt").textContent=featured.excerpt||"";
    $("#lead-meta").innerHTML="<strong>"+esc(featured.paparazi_profiles?.display_name||"PAPARAZZI🇬🇲")
      +"</strong><span>•</span><span>"+fmtDate(featured.published_at||featured.created_at)+"</span>";
    $("#lead-link").href=storyHref(featured);

    const visual=$("#lead-visual");
    visual.classList.toggle("has-image",Boolean(featured.cover_url));
    visual.innerHTML=coverImage(featured.cover_url,featured.title,"eager")
      +"<div class='visual-noise'></div><div class='visual-label'>"+esc(featured.category||"PAPARAZZI")
      +"</div><span class='visual-number'>01</span>";

    $("#hero-rail-list").innerHTML=stories.slice(1,4).map(railItem).join("");
    $("#latest-grid").innerHTML=stories.slice(1).map(latestItem).join("");

    $("#ticker-track").textContent=usingStarter
      ?"The newsroom is open — send a tip, become a contributor or read the first page."
      :stories.slice(0,4).map(x=>x.title).join("  •  ");

    $("#latest-subtitle").textContent=usingStarter
      ?"Start here, then come back for the community's first stories."
      :"Fresh eyes. Local ears. New stories from the PAPARAZZI newsroom.";
  }

  async function initStory(){
    const root=$("#story-root");
    if(!root)return;

    const slug=new URLSearchParams(location.search).get("slug")||"welcome-to-paparazzi";
    let story=null;

    if(supabase){
      try{
        const result=await withTimeout(
          supabase.from("paparazi_articles")
            .select("id,title,slug,excerpt,body,cover_url,category,status,created_at,published_at,paparazi_profiles(display_name,username,avatar_url)")
            .eq("slug",slug)
            .eq("status","published")
            .maybeSingle(),
          4500,
          null
        );
        story=result?.data||null;
      }catch(_){}
    }

    if(!story)story=starterStories.find(item=>item.slug===slug)||null;

    if(!story){
      root.innerHTML="<div class='container'><div class='empty-state' style='margin:60px 0'><h3>That story has left the timeline.</h3><p>Try the latest stories instead.</p><a class='btn btn-dark' href='index.html#latest'>Back to latest</a></div></div>";
      return;
    }

    const author=story.paparazi_profiles||story.author||{};
    const body=String(story.body||"").split(/\n\s*\n/).map(p=>"<p>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("");
    const image=story.cover_url?coverImage(story.cover_url,story.title,"eager"):"";

    const storyUrl=SITE_ORIGIN+"/stories/"+encodeURIComponent(story.slug)+".html";
    const shareUrl=location.href;
    const storyImage=story.cover_url||SITE_ORIGIN+"/og-image.svg";
    const storyDescription=story.excerpt||String(story.body||"").slice(0,180);

    updateSocialMeta({
      title:story.title+" — PAPARAZZI🇬🇲",
      description:storyDescription,
      url:storyUrl,
      image:storyImage,
      type:"article",
      publishedAt:story.published_at||story.created_at,
      modifiedAt:story.updated_at||story.published_at||story.created_at,
      author:author.display_name||author.username||"PAPARAZZI🇬🇲",
      category:story.category||"Story"
    });
    installArticleSchema(story,author,storyUrl,storyImage);

    root.innerHTML="<div class='container story-reader'>"
      +"<div class='story-reader-head'><div class='kicker'>"+esc(story.category||"Story")+"</div>"
      +"<h1>"+esc(story.title)+"</h1><p class='story-dek'>"+esc(story.excerpt||"")+"</p>"
      +"<div class='meta' style='margin-top:18px'><strong>"+esc(author.display_name||"PAPARAZZI🇬🇲")
      +"</strong><span>•</span><span>"+fmtDate(story.published_at||story.created_at)+"</span></div></div>"
      +"<div class='story-cover'>"+image+"<div class='cover-inner'><div class='cover-words'>"+esc(story.title)
      +"</div></div></div><div class='story-body'>"+body+"</div>"
      +"<div class='author-box'><div class='avatar'>"+esc(initials(author.display_name||"PAPARAZZI"))
      +"</div><div><strong>"+esc(author.display_name||"PAPARAZZI🇬🇲")+"</strong>"
      +"<div style='color:#7f786f;font-size:.82rem'>@"+esc(author.username||"paparazzigambia")
      +" · PAPARAZZI newsroom</div></div></div>"
      +"<div class='story-next'><button id='share-story' class='btn btn-dark' type='button'>Share story →</button>"
      +"<a class='btn btn-ghost' href='index.html#latest'>← Back to latest</a>"
      +"<a class='btn btn-ghost' href='submit.html'>Send a tip →</a></div></div>";

    const shareStory=$("#share-story");
    if(shareStory)shareStory.onclick=()=>shareContent({
      title:story.title,
      text:storyDescription,
      url:shareUrl,
      imageUrl:story.cover_url||null
    });
  }

  async function initJoin(){
    const signIn=$("#sign-in-form");
    const signUp=$("#sign-up-form");
    if(!signIn||!signUp)return;

    const tabs=$$(".switcher button");
    const setMode=mode=>{
      tabs.forEach(button=>button.classList.toggle("active",button.dataset.mode===mode));
      signIn.style.display=mode==="signin"?"":"none";
      signUp.style.display=mode==="signup"?"":"none";
    };

    tabs.forEach(button=>button.addEventListener("click",()=>setMode(button.dataset.mode)));
    setMode("signin");

    if(!supabase){
      setStatus($("#sign-in-status"),"Account services are temporarily unavailable.","error");
      return;
    }

    signIn.addEventListener("submit",async e=>{
      e.preventDefault();
      const box=$("#sign-in-status");
      const result=await withTimeout(
        supabase.auth.signInWithPassword({
          email:$("#signin-email").value.trim(),
          password:$("#signin-password").value
        }),
        8000,
        {error:{message:"The sign-in service took too long to respond. Try again."}}
      );
      if(result?.error){
        setStatus(box,result.error.message.includes("Invalid login")
          ?"That email or password didn't match. Try again."
          :result.error.message,"error");
        return;
      }
      setStatus(box,"You're in. Taking you to the newsroom…","ok");
      setTimeout(()=>location.href="studio.html",450);
    });

    signUp.addEventListener("submit",async e=>{
      e.preventDefault();
      const box=$("#sign-up-status");
      const name=$("#signup-name").value.trim();
      const email=$("#signup-email").value.trim();
      const password=$("#signup-password").value;

      if(password!==$("#signup-confirm").value){
        setStatus(box,"Your passwords don't match yet.","error");
        return;
      }
      if(password.length<8){
        setStatus(box,"Use at least 8 characters for the password.","error");
        return;
      }

      const result=await withTimeout(
        supabase.auth.signUp({email,password}),
        8000,
        {error:{message:"The sign-up service took too long to respond. Try again."}}
      );

      if(result?.error){setStatus(box,result.error.message,"error");return;}

      if(result?.data?.user&&Array.isArray(result.data.user.identities)&&result.data.user.identities.length===0){
        setStatus(box,"That account already exists. Sign in instead.","error");
        return;
      }

      if(result?.data?.session){
        const profile=await ensureProfile(result.data.user);
        if(profile&&name&&profile.display_name!==name){
          await supabase.from("paparazi_profiles").update({display_name:name}).eq("id",result.data.user.id);
        }
        setStatus(box,"Account created. Welcome to PAPARAZZI.","ok");
        setTimeout(()=>location.href="studio.html",500);
      }else{
        setStatus(box,"Account created. Check your email to confirm it, then come back and sign in.","ok");
      }
    });

    const reset=$("#reset-password");
    if(reset)reset.addEventListener("click",async()=>{
      const email=$("#signin-email").value.trim();
      const box=$("#sign-in-status");
      if(!email){
        setStatus(box,"Enter your email first, then tap forgot password.","error");
        return;
      }
      const result=await withTimeout(
        supabase.auth.resetPasswordForEmail(email),
        8000,
        {error:{message:"The reset service took too long to respond. Try again."}}
      );
      setStatus(box,
        result?.error?.message||"Password reset instructions have been sent to your email.",
        result?.error?"error":"ok"
      );
    });
  }

  async function loadMyArticles(uid){
    const box=$("#my-articles");
    if(!box||!supabase)return;

    const result=await withTimeout(
      supabase.from("paparazi_articles").select("*").eq("author_id",uid).order("created_at",{ascending:false}).limit(20),
      5000,
      {data:[],error:{message:"timeout"}}
    );

    if(result?.error||!result?.data?.length){
      box.innerHTML="<div class='empty-state'><h3>Your first story is still waiting.</h3><p>Write something only someone on the ground would know.</p></div>";
      return;
    }

    box.innerHTML=result.data.map(item=>"<div class='article-item'><div><strong>"+esc(item.title)
      +"</strong><div class='meta' style='margin-top:5px'><span>"+esc(item.category||"Story")
      +"</span><span>•</span><span>"+fmtDate(item.published_at||item.created_at)
      +"</span></div></div><span class='status "+esc(item.status)+"'>"+esc(item.status)+"</span></div>").join("");
  }

  async function initStudio(){
    const gate=$("#studio-gate");
    const app=$("#studio-app");
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

    const coverInput=$("#article-cover");
    if(coverInput){
      coverInput.addEventListener("change",()=>renderSelectedFiles(coverInput,"#article-cover-list",1));
    }

    const joinBtn=$("#become-paparazzi");
    if(joinBtn){
      joinBtn.textContent=profile?.is_paparazzi?"You're a PAPARAZZI ✓":"Become a PAPARAZZI";
      joinBtn.disabled=!!profile?.is_paparazzi;

      joinBtn.onclick=async()=>{
        const result=await supabase.from("paparazi_profiles").update({is_paparazzi:true}).eq("id",user.id);
        if(result.error){toast(result.error.message,"error");return;}
        profile={...profile,is_paparazzi:true};
        $("#paparazzi-status").textContent="PAPARAZZI contributor";
        joinBtn.textContent="You're a PAPARAZZI ✓";
        joinBtn.disabled=true;
        toast("Welcome to the newsroom.");
      };
    }

    const signOut=$("#sign-out");
    if(signOut)signOut.addEventListener("click",async()=>{
      await supabase.auth.signOut();
      location.href="index.html";
    });

    const form=$("#article-form");
    if(form)form.addEventListener("submit",async e=>{
      e.preventDefault();

      if(!profile?.is_paparazzi){
        toast("Join the PAPARAZZI contributor crew first.","error");
        return;
      }

      const title=$("#article-title").value.trim();
      const category=$("#article-category").value;
      const excerpt=$("#article-excerpt").value.trim();
      const body=$("#article-body").value.trim();
      const coverFile=coverInput?.files?.[0]||null;

      if(body.length<20){
        toast("Give the story a little more room to breathe.","error");
        return;
      }

      if(coverFile){
        const coverError=validateMediaFiles([coverFile],1);
        if(coverError){
          toast(coverError,"error");
          return;
        }
        if(!/^image\\//i.test(coverFile.type)){
          toast("The cover must be an image file.","error");
          return;
        }
      }

      let slug=slugify(title)||"story";
      const duplicate=await supabase.from("paparazi_articles").select("id").eq("slug",slug).maybeSingle();
      if(duplicate.data)slug=slug+"-"+Math.random().toString(36).slice(2,7);

      const articleId=crypto.randomUUID();
      const publishButton=form.querySelector("button[type='submit'],button.btn-dark");
      const originalText=publishButton?.textContent||"Publish story →";
      if(publishButton){
        publishButton.disabled=true;
        publishButton.textContent=coverFile?"Uploading cover…":"Publishing…";
      }

      try{
        let media=[];
        let coverUrl=null;

        if(coverFile){
          media=await uploadMediaFiles([coverFile],MEDIA_BUCKET,"stories/"+user.id+"/"+articleId,(done)=>{
            if(publishButton)publishButton.textContent=done===1?"Uploading cover…":"Uploading…";
          },true);
          coverUrl=media[0]?.url||null;
        }

        const result=await supabase.from("paparazi_articles").insert({
          id:articleId,
          author_id:user.id,
          title,
          slug,
          excerpt,
          body,
          cover_url:coverUrl,
          media_urls:media,
          category,
          status:"published",
          published_at:new Date().toISOString()
        });

        if(result.error){
          toast(result.error.message,"error");
          return;
        }

        form.reset();
        const coverList=$("#article-cover-list");
        if(coverList)coverList.innerHTML="";
        toast("Published. Now go tell the timeline.");
        loadMyArticles(user.id);
      }catch(error){
        console.error("PAPARAZZI story media upload:",error);
        toast(error.message||"We couldn't upload the cover image. Try again.","error");
      }finally{
        if(publishButton){
          publishButton.disabled=false;
          publishButton.textContent=originalText;
        }
      }
    });

    loadMyArticles(user.id);
  }

  async function initSubmit(){
    const form=$("#tip-form");
    if(!form)return;

    const anonymous=$("#tip-anonymous");
    const identity=$("#tip-identity");
    const mediaInput=$("#tip-media");
    const mediaList=$("#tip-media-list");
    if(!anonymous||!identity)return;

    const sync=()=>identity.style.display=anonymous.checked?"none":"grid";
    anonymous.addEventListener("change",sync);
    sync();

    if(mediaInput){
      mediaInput.addEventListener("change",()=>renderSelectedFiles(mediaInput,"#tip-media-list",20));
    }

    form.addEventListener("submit",async e=>{
      e.preventDefault();

      if($("#website-check")?.value)return;
      if(!supabase){
        setStatus($("#tip-status"),"The tip line is temporarily unavailable.","error");
        return;
      }

      const files=Array.from(mediaInput?.files||[]);
      const mediaError=validateMediaFiles(files,20);
      if(mediaError){
        setStatus($("#tip-status"),mediaError,"error");
        return;
      }

      const submitId=crypto.randomUUID();
      const submitButton=form.querySelector("button[type='submit'],button.btn-dark");
      const originalText=submitButton?.textContent||"Send tip privately →";
      if(submitButton){
        submitButton.disabled=true;
        submitButton.textContent=files.length?"Uploading media…":"Sending tip…";
      }

      try{
        let media=[];
        if(files.length){
          media=await uploadMediaFiles(files,TIPS_BUCKET,"tips/"+submitId,(done,total)=>{
            if(submitButton)submitButton.textContent="Uploading "+done+" of "+total+"…";
          });
        }

        const payload={
          id:submitId,
          submitter_user_id:anonymous.checked?null:((await currentSession())?.user?.id||null),
          is_anonymous:anonymous.checked,
          submitter_name:anonymous.checked?null:$("#tip-name").value.trim(),
          submitter_email:anonymous.checked?null:$("#tip-email").value.trim(),
          category:$("#tip-category").value,
          title:$("#tip-title").value.trim()||null,
          story:$("#tip-story").value.trim(),
          location:$("#tip-location").value.trim()||null,
          media_urls:media
        };

        if(payload.story.length<10){
          setStatus($("#tip-status"),"Tell us what happened first.","error");
          return;
        }

        const result=await withTimeout(
          supabase.from("paparazi_submissions").insert(payload).select("id").single(),
          8000,
          {error:{message:"The tip line took too long to respond. Try again."}}
        );

        if(result?.error){
          setStatus($("#tip-status"),result.error.message,"error");
          return;
        }

        form.reset();
        if(mediaList)mediaList.innerHTML="";
        anonymous.checked=true;
        sync();
        setStatus($("#tip-status"),
          "Tip received"+(media.length?" with "+media.length+" media file"+(media.length===1?"":"s"):"")+". Keep this reference: "+(result?.data?.id?String(result.data.id).slice(0,8).toUpperCase():"RECEIVED")+".",
          "ok"
        );
      }catch(error){
        console.error("PAPARAZZI media upload:",error);
        setStatus($("#tip-status"),error.message||"We couldn't upload the media. Try again.","error");
      }finally{
        if(submitButton){
          submitButton.disabled=false;
          submitButton.textContent=originalText;
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded",async()=>{
    hideSplash();
    initMotion();
    initShell();

    try{
      const page=document.body.dataset.page;
      if(page==="home")await initHome();
      if(page==="story")await initStory();
      if(page==="join")await initJoin();
      if(page==="studio")await initStudio();
      if(page==="submit")await initSubmit();

      hideSplash();
      document.body.classList.add("page-ready");
    }catch(error){
      console.error("PAPARAZZI startup error:",error);
      hideSplash();
      document.body.classList.add("page-ready");
      toast("PAPARAZZI loaded with a temporary service issue.","error");
    }
  });
})();