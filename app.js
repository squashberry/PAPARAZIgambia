(function(){
  "use strict";

  const supabase=window.PAPARAZZI_API||null;
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

  const authorHref=username=>username?"author.html?u="+encodeURIComponent(username):"join.html";

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
      const file=await watermarkImageFile(list[i]);
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
    const mobileAccount=$("#mobile-account");
    const signout=$("#nav-signout");
    const mobileSignout=$("#mobile-signout");
    const bell=$("#nav-notifications");
    const mobileBell=$("#mobile-notifications");
    const displayName=String(profile?.display_name||session?.user?.email?.split("@")?.[0]||"ACCOUNT").trim();
    const label=displayName.length>18?displayName.slice(0,17)+"…":displayName;
    const doSignOut=async(button)=>{
      if(button)button.disabled=true;
      try{
        const result=await supabase?.auth?.signOut();
        if(result?.error)throw new Error(result.error.message||"Unable to sign out.");
        location.replace("index.html");
      }catch(error){
        toast(error?.message||"Unable to sign out.","error");
        if(button)button.disabled=false;
      }
    };
    if(session){
      if(account){account.textContent=label;account.title=displayName;account.href=profile?.username?"author.html?u="+encodeURIComponent(profile.username):"index.html#your-paparazzi";}
      if(mobileAccount){mobileAccount.textContent=displayName;mobileAccount.href=profile?.username?"author.html?u="+encodeURIComponent(profile.username):"index.html#your-paparazzi";}
      [signout,mobileSignout].forEach(button=>{
        if(button){button.hidden=false;button.disabled=false;button.onclick=()=>doSignOut(button);}
      });
      [bell,mobileBell].forEach(el=>{if(el){el.hidden=false;el.textContent="NOTIFICATIONS";el.href="notifications.html";}});
    }else{
      if(account){account.textContent="SIGN IN";account.href="join.html";account.title="Sign in";}
      if(mobileAccount){mobileAccount.textContent="Sign in";mobileAccount.href="join.html";}
      [signout,mobileSignout].forEach(button=>{if(button){button.hidden=true;button.disabled=false;button.onclick=null;}});
      [bell,mobileBell].forEach(el=>{if(el)el.hidden=true;});
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
    author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"},
    cover_url:"https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=85"
  };

  const starterStories=[
    seed,
    {
      slug:"how-paparazzi-works",title:"How PAPARAZZI works",category:"Inside PAPARAZZI",
      excerpt:"Tips come in fast. We slow down long enough to check the story, add context and decide what is worth publishing.",
      body:"PAPARAZZI is built for the moments people actually talk about. Community tips are reviewed before publication, and contributors publish under their own byline.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"},
      cover_url:"https://images.unsplash.com/photo-1492684223066-81342ee5ff71?auto=format&fit=crop&w=1200&q=85"
    },
    {
      slug:"weekend-in-the-gambia",title:"The weekend is where The Gambia comes alive",category:"Nightlife",
      excerpt:"From beachside evenings to packed dance floors, weekends have their own rhythm. Here is what makes the scene feel unmistakably Gambian.",
      body:"There is a particular energy to a Gambian weekend. Plans start casually, group chats get louder, outfits become more intentional and suddenly everybody seems to know where everybody else is going.\n\nPAPARAZZI is interested in that atmosphere: the people getting ready, the music, the style, the unexpected meetings and the small moments that become tomorrow's conversation.\n\nThis is an editorial look at the culture around a night out, not a report of one specific event.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"},
      cover_url:"https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85"
    },
    {
      slug:"gambian-style-watch",title:"Style watch: why the details always matter",category:"Style",
      excerpt:"The outfit is rarely just the outfit. Colour, confidence, tailoring and the smallest accessories can tell the whole story.",
      body:"Walk through any busy social setting and you will notice that Gambian style does not need to shout to be remembered. A clean pair of shoes, a sharp cut, carefully chosen jewellery or one unexpected piece can completely change the look.\n\nPAPARAZZI wants to document that creativity without turning people into costumes. When we spotlight style, the person comes first and the clothes tell the rest of the story.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"},
      cover_url:"https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85"
    },
    {
      slug:"faces-to-watch",title:"Faces to watch: the people shaping the next scene",category:"People",
      excerpt:"Creators, organisers, performers and everyday personalities are building the culture around us. We are paying attention.",
      body:"Every scene has people quietly moving it forward. They organise the event, start the conversation, make the music, build the look, photograph the night or simply bring everyone together.\n\nThis recurring PAPARAZZI column is about discovering those personalities before they become impossible to miss. We will keep the focus on work, character and contribution.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"},
      cover_url:"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85"
    },
    {
      slug:"the-art-of-the-gambian-event",title:"The art of putting on a Gambian event",category:"Events",
      excerpt:"A good event looks effortless from the crowd. Behind it is timing, logistics, promotion and a lot of people doing their jobs.",
      body:"Before the first guest arrives, somebody has already spent weeks thinking about the room, the sound, the guest list, the promotion and what happens when the unexpected inevitably happens.\n\nGreat events are a form of storytelling. The venue sets the mood, the crowd gives it life and the smallest details determine what people remember on Monday.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"},
      cover_url:"https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85"
    },
    {
      slug:"what-makes-a-story",title:"What makes a story worth publishing?",category:"Inside PAPARAZZI",
      excerpt:"Not every viral post is a story. Here is the test we use before something earns a place on the newsroom.",
      body:"A story needs more than noise. We look for something people genuinely need or want to understand, a clear reason it matters, enough context to avoid misleading readers and a way to separate what is known from what is only being claimed.\n\nThat standard matters especially when a post involves real people. Interesting is good. Accurate is better.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"},
      cover_url:"https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=85"
    },
    {
      slug:"phone-camera-to-newsroom",title:"From phone camera to newsroom: how a tip becomes a story",category:"Community",
      excerpt:"You do not need a press badge to notice something worth reporting. You do need context, care and the facts you can verify.",
      body:"A useful tip can be as simple as a photograph, a location and a clear explanation of what happened. The more context you can provide, the easier it is for the newsroom to check the lead.\n\nDo not put yourself in danger for a photograph. Do not publish private information just because it is available. Send what you know and let the newsroom do the checking.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"},
      cover_url:"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=85"
    },
    {
      slug:"send-a-tip",title:"You saw it. Send the tip.",category:"Tip line",
      excerpt:"A photo, a lead, a rumour worth checking or a detail everyone else missed can start a story.",
      body:"Anonymous tips are welcome. We review submissions before anything reaches the front page. If you can include when and where something happened, what you personally saw and any media you own, that helps us verify it.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"},
      cover_url:"https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85"
    },
    {
      slug:"become-a-paparazzi",title:"Your byline can start here",category:"Community",
      excerpt:"Create an account, become a PAPARAZZI contributor and publish stories from the places you know best.",
      body:"The newsroom works better when the people closest to the story can tell it. Build your contributor profile, choose the beats you understand and publish original work through the PAPARAZZI studio.",
      author:{display_name:"PAPARAZZI🇬🇲",username:"paparazzigambia"},
      cover_url:"https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=85"
    }
  ];

  async function fetchStories(limit=12){
    if(!supabase)return {data:[],error:null};
    try{
      const result=await withTimeout(
        supabase.from("paparazi_articles")
          .select("id,title,slug,excerpt,body,cover_url,media_urls,category,status,created_at,published_at,paparazi_profiles(display_name,username,avatar_url)")
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
      ? "<span class='pz-media' data-pz-watermark><img loading='"+loading+"' referrerpolicy='no-referrer' alt='"+esc(alt)+"' src='"+esc(url)+"' onerror=\"this.closest('.pz-media')?.remove()\"><span class='pz-watermark' aria-hidden='true'>PAPARAZZI</span></span>"
      : "";
  }

  async function watermarkImageFile(file){
    if(!file || !/^image\//i.test(file.type))return file;
    try{
      const bitmap=await createImageBitmap(file);
      const maxDimension=2400;
      const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext("2d",{alpha:true});
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const size=Math.max(18,Math.round(canvas.width*0.022));
      ctx.save(); ctx.font="900 "+size+"px Arial,sans-serif"; ctx.textAlign="right"; ctx.textBaseline="bottom";
      ctx.fillStyle="rgba(255,255,255,.86)"; ctx.shadowColor="rgba(0,0,0,.65)"; ctx.shadowBlur=Math.max(2,size*.18);
      ctx.fillText("PAPARAZZI",canvas.width-size*.55,canvas.height-size*.55); ctx.restore();
      bitmap.close?.();
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,file.type==="image/png"?"image/png":"image/jpeg",.92));
      return blob ? new File([blob],file.name,{type:blob.type||file.type,lastModified:Date.now()}) : file;
    }catch(_){ return file; }
  }

  window.PAPARAZZI_WATERMARK_FILE=watermarkImageFile;
  function storyMediaUrls(story){const raw=Array.isArray(story?.media_urls)?story.media_urls:[];const urls=raw.map(item=>typeof item==="string"?item:item?.url).filter(Boolean);if(story?.cover_url&&!urls.includes(story.cover_url))urls.unshift(story.cover_url);return [...new Set(urls)];}
  function installImageWatermarks(root=document){
    $$("img:not([data-pz-wrapped])",root).forEach(img=>{
      if(img.closest(".pz-media")){img.dataset.pzWrapped="true";return;}
      const wrap=document.createElement("span"); wrap.className="pz-media"; wrap.dataset.pzWatermark="true";
      img.parentNode?.insertBefore(wrap,img); wrap.appendChild(img);
      const mark=document.createElement("span"); mark.className="pz-watermark"; mark.setAttribute("aria-hidden","true"); mark.textContent="PAPARAZZI";
      wrap.appendChild(mark); img.dataset.pzWrapped="true";
    });
  }

  function railItem(story){
    const author=story.paparazi_profiles?.display_name||story.author?.display_name||"PAPARAZZI🇬🇲";
    return "<a class='rail-item' data-morph href='"+storyHref(story)+"'>"
      +"<div class='rail-thumb'>"+coverImage(story.cover_url,story.title)+"</div>"
      +"<div><div class='kicker'>"+esc(story.category||"Story")+"</div>"
      +"<h3>"+esc(story.title)+"</h3>"
      +"<div class='meta'><a class='author-link' href='"+authorHref(story.paparazi_profiles?.username||story.author?.username)+"'>"+esc(author)+"</a><span>•</span><span>"+fmtDate(story.published_at||story.created_at)+"</span></div></div></a>";
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
      +"<div class='meta' style='margin-top:10px'><a class='author-link' href='"+authorHref(story.paparazi_profiles?.username||story.author?.username)+"'><strong>"+esc(author)+"</strong></a><span>•</span><span>"+fmtDate(story.published_at||story.created_at)+"</span></div></div>"
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
    const mediaUrls=storyMediaUrls(story);
    const primaryImage=mediaUrls[0]||null;
    const image=primaryImage?coverImage(primaryImage,story.title,"eager"):"";
    const gallery=mediaUrls.length>1?"<div class='story-gallery'>"+mediaUrls.map((url,index)=>"<figure class='story-gallery-item'><span class='pz-media' data-pz-watermark><img loading='lazy' referrerpolicy='no-referrer' src='"+esc(url)+"' alt='"+esc(story.title+" — image "+(index+1))+"'><span class='pz-watermark' aria-hidden='true'>PAPARAZZI</span></span><figcaption>PHOTO "+String(index+1).padStart(2,"0")+"</figcaption></figure>").join("")+"</div>":"";

    const storyUrl=SITE_ORIGIN+"/story.html?slug="+encodeURIComponent(story.slug);
    const shareUrl=location.href;
    const storyImage=primaryImage||SITE_ORIGIN+"/og-image.svg";
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
      +"<div class='meta' style='margin-top:18px'><a class='author-link' href='"+authorHref(author.username)+"'><strong>"+esc(author.display_name||"PAPARAZZI🇬🇲")
      +"</strong></a><span>•</span><span>"+fmtDate(story.published_at||story.created_at)+"</span></div></div>"
      +"<div class='story-cover'>"+image+"<div class='cover-inner'><div class='cover-words'>"+esc(story.title)
      +"</div></div></div>"+gallery+"<div class='story-body'>"+body+"</div>"
      +"<a class='author-box' href='"+authorHref(author.username)+"'><div class='avatar'>"+esc(initials(author.display_name||"PAPARAZZI"))
      +"</div><div><strong>"+esc(author.display_name||"PAPARAZZI🇬🇲")+"</strong>"
      +"<div style='color:#7f786f;font-size:.82rem'>@"+esc(author.username||"paparazzigambia")
      +" · PAPARAZZI newsroom</div></div></a>"
      +"<div class='story-next'><button id='share-story' class='btn btn-dark' type='button'>Share story →</button>"
      +"<a class='btn btn-ghost' href='index.html#latest'>← Back to latest</a>"
      +"<a class='btn btn-ghost' href='submit.html'>Send a tip →</a></div></div>";

    const shareStory=$("#share-story");
    if(shareStory)shareStory.onclick=()=>shareContent({
      title:story.title,
      text:storyDescription,
      url:shareUrl,
      imageUrl:primaryImage||null
    });

    // Every story ends with related reading + a quiet contributor earnings CTA.
    const related=starterStories.concat([]);
    let relatedStories=[];
    try{
      const rr=await fetchStories(18);
      relatedStories=(rr.data.length?rr.data:starterStories)
        .filter(item=>item.slug!==story.slug)
        .sort((a,b)=>String(a.category||"").localeCompare(String(b.category||""))===0?0:1)
        .slice(0,3);
    }catch(_){}
    if(!relatedStories.length) relatedStories=starterStories.filter(item=>item.slug!==story.slug).slice(0,3);

    const relatedHtml=relatedStories.map(item=>{
      const authorName=item.paparazi_profiles?.display_name||item.author?.display_name||"PAPARAZZI🇬🇲";
      return "<a class='related-card' data-morph href='"+storyHref(item)+"'>"
        +"<div class='related-art'>"+coverImage(item.cover_url,item.title)+"</div>"
        +"<div class='related-copy'><div class='kicker'>"+esc(item.category||"Story")+"</div>"
        +"<h3>"+esc(item.title)+"</h3><div class='meta'><span>"+esc(authorName)+"</span><span>•</span><span>"+fmtDate(item.published_at||item.created_at)+"</span></div></div></a>";
    }).join("");

    const earningMarkup="<section class='story-earn-wrap'>"
      +"<button class='story-earn-banner' id='story-earn-banner' type='button'>"
      +"<span class='story-earn-mark'>₳</span><span class='story-earn-copy'><strong>Earn dalasis with PAPARAZZI</strong><small>Post original blogs. Unique photos and videos can earn bonus consideration when PAPARAZZI is your first publication.</small></span><span class='story-earn-arrow'>→</span>"
      +"</button></section>";

    const adSlotHtml="<div id='story-ad-slot' class='story-ad-slot' aria-label='Advertisement'></div>";
    const relatedMarkup="<section class='related-section'><div class='section-head'><div><div class='eyebrow'>KEEP READING</div><h2>Related posts</h2></div></div><div class='related-grid'>"+relatedHtml+"</div></section>";

    const existingReader=$("#story-root .story-reader");
    if(existingReader){
      existingReader.insertAdjacentHTML("beforeend",adSlotHtml+earningMarkup+relatedMarkup);
    }

    const adSlotEl=$("#story-ad-slot");
    if(adSlotEl&&window.PAPARAZZI_API?.auth?.getActiveAd){
      try{
        const ar=await window.PAPARAZZI_API.auth.getActiveAd("story"),ad=ar.data;
        if(ad){
          adSlotEl.innerHTML="<div class='story-ad-label'>ADVERTISEMENT</div><a class='story-ad-card' href='"+esc(ad.target_url)+"' target='_blank' rel='sponsored noopener noreferrer' data-ad-id='"+esc(ad.id)+"'><div class='story-ad-copy'><div class='eyebrow'>PARTNER</div><h3>"+esc(ad.title)+"</h3><p>"+esc(ad.body||"")+"</p><span>Learn more →</span></div>"+(ad.image_url?"<img src='"+esc(ad.image_url)+"' alt='' loading='lazy'>":"")+"</a>";
          window.PAPARAZZI_API.auth.recordAdEvent(ad.id,"impression").catch(()=>{});
          adSlotEl.querySelector(".story-ad-card")?.addEventListener("click",()=>window.PAPARAZZI_API.auth.recordAdEvent(ad.id,"click").catch(()=>{}));
        }
      }catch(_){}
    }

    const earnBtn=$("#story-earn-banner");
    if(earnBtn)earnBtn.onclick=async()=>{
      const session=await currentSession();
      const showEarnModal=message=>{
        let modal=$("#earn-modal");
        if(!modal){
          modal=document.createElement("div");
          modal.id="earn-modal";
          modal.className="modal-backdrop";
          document.body.appendChild(modal);
        }
        modal.innerHTML="<div class='modal-card' role='dialog' aria-modal='true' aria-labelledby='earn-modal-title'><button class='modal-close' type='button' aria-label='Close'>×</button><div class='eyebrow'>PAPARAZZI EARNINGS</div><h2 id='earn-modal-title'>"+(session?"You're not eligible yet.":"Sign in to check your PAPARAZZI earnings.")+"</h2><p>"+esc(message)+"</p>"+(session?"<p class='modal-note'>Keep publishing original work, build your reporting record and check back as the newsroom grows.</p>":"<div class='form-actions'><a class='btn btn-dark' href='join.html'>Sign in / create account →</a></div>")+"</div>";
        modal.classList.add("is-open");
        modal.querySelector(".modal-close").onclick=()=>modal.classList.remove("is-open");
        modal.onclick=e=>{if(e.target===modal)modal.classList.remove("is-open");};
      };
      if(!session)showEarnModal("You need a PAPARAZZI account before we can show your contributor eligibility. Create an account or sign in, then come back here.");
      else showEarnModal("You're not eligible to earn on blog posts yet. Try harder to unlock eligibility and check back again.");
    };
  }

  async function initJoin(){
    const existingSession=await currentSession();
    if(existingSession){
      const existingProfile=await ensureProfile(existingSession.user);
      const target=existingProfile?.username
        ? "author.html?u="+encodeURIComponent(existingProfile.username)
        : "index.html#your-paparazzi";
      location.replace(target);
      return;
    }
    const requestedNext=new URLSearchParams(location.search).get("next");
    const authNext=(requestedNext&&/^[a-z0-9._/-]+(?:\?[a-z0-9_=&%.-]+)?$/i.test(requestedNext)&&!requestedNext.includes("//"))?requestedNext:null;
    const signIn=$("#sign-in-form"),signUp=$("#sign-up-form"),verifyPanel=$("#verification-panel");
    if(!signIn||!signUp)return;
    const tabs=$$(".switcher button");
    const forms=$("#auth-forms");
    let verificationEmail="";
    let resendTimer=null;

    const setMode=mode=>{
      const signin=mode==="signin";
      tabs.forEach(button=>{
        const active=button.dataset.mode===mode;
        button.classList.toggle("active",active);
        button.setAttribute("aria-selected",String(active));
      });
      signIn.hidden=!signin;
      signUp.hidden=signin;
      const progress=$(".signup-progress");
      if(progress)progress.hidden=signin;
      if(verifyPanel)verifyPanel.hidden=true;
      if(forms)forms.classList.remove("auth-success");
    };

    const setBusy=(button,busy,label)=>{
      if(!button)return;
      button.disabled=busy;
      if(busy){
        button.dataset.originalLabel=button.textContent;
        button.innerHTML="<span class='button-spinner'></span>"+esc(label||"Working…");
      }else{
        button.textContent=button.dataset.originalLabel||button.textContent;
      }
    };

    const showVerification=email=>{
      verificationEmail=email;
      const progress=$(".signup-progress");
      if(progress){progress.hidden=false;$(".signup-state-dot").forEach(dot=>dot.classList.toggle("active",Number(dot.dataset.step)===3));}
      if(forms)forms.classList.add("auth-success");
      signIn.hidden=true;
      signUp.hidden=true;
      if(verifyPanel)verifyPanel.hidden=false;
      const label=$("#verification-email");
      if(label)label.textContent=email;
      const inputs=$$(".otp-input");
      inputs.forEach((input,index)=>{input.value="";input.disabled=false;if(index===0)input.focus();});
      startResendTimer(60);
    };

    const startResendTimer=seconds=>{
      const button=$("#resend-code");
      if(!button)return;
      clearInterval(resendTimer);
      let left=seconds;
      button.disabled=true;
      button.textContent="Resend code ("+left+"s)";
      resendTimer=setInterval(()=>{
        left--;
        if(left<=0){
          clearInterval(resendTimer);
          button.disabled=false;
          button.textContent="Resend code";
        }else button.textContent="Resend code ("+left+"s)";
      },1000);
    };

    const verificationMessage=(message,kind="")=>{
      const box=$("#verification-status");
      if(!box)return;
      box.textContent=message||"";
      box.className="auth-feedback "+kind;
      box.hidden=!message;
    };

    const completeVerification=()=>{
      if(forms)forms.classList.remove("auth-success");
      if(verifyPanel)verifyPanel.classList.add("verified");
      const title=$("#verification-title"),copy=$("#verification-copy");
      if(title)title.textContent="EMAIL VERIFIED";
      if(copy)copy.textContent="Your PAPARAZZI account is ready. Welcome to the newsroom.";
      const codeGrid=$("#otp-grid"),actions=$("#verification-actions");
      if(codeGrid)codeGrid.hidden=true;
      if(actions)actions.hidden=true;
      const success=$("#verification-success");
      if(success)success.hidden=false;
      setTimeout(()=>location.href=(authNext||"index.html?welcome=1"),900);
    };

    const tabsReady=!!tabs.length;
    if(tabsReady)tabs.forEach(button=>button.addEventListener("click",event=>{
      event.preventDefault();
      setMode(button.dataset.mode);
    }));
    setMode("signin");

    if(!supabase){
      setStatus($("#sign-in-status"),"Account services are temporarily unavailable.","error");
      return;
    }

    const inputs=$$(".otp-input");
    inputs.forEach((input,index)=>{
      input.addEventListener("input",()=>{
        input.value=input.value.replace(/\D/g,"").slice(0,1);
        if(input.value&&inputs[index+1])inputs[index+1].focus();
      });
      input.addEventListener("keydown",event=>{
        if(event.key==="Backspace"&&!input.value&&inputs[index-1])inputs[index-1].focus();
      });
      input.addEventListener("paste",event=>{
        const pasted=(event.clipboardData?.getData("text")||"").replace(/\D/g,"").slice(0,6);
        if(!pasted)return;
        event.preventDefault();
        pasted.split("").forEach((digit,i)=>{if(inputs[i])inputs[i].value=digit;});
        inputs[Math.min(pasted.length,inputs.length)-1]?.focus();
      });
    });

    const verifyBtn=$("#verify-code");
    if(verifyBtn)verifyBtn.addEventListener("click",async()=>{
      const code=inputs.map(x=>x.value).join("");
      if(code.length!==6){verificationMessage("Enter all six digits first.","error");return;}
      verificationMessage("Checking your code…","loading");
      setBusy(verifyBtn,true,"Verifying…");
      const result=await withTimeout(
        supabase.auth.verifyEmailCode({email:verificationEmail,code}),
        10000,
        {error:{message:"Verification took too long. Check your connection and try again."}}
      );
      setBusy(verifyBtn,false);
      if(result?.error){
        verificationMessage(result.error.message,"error");
        verifyPanel?.classList.remove("shake");
        void verifyPanel?.offsetWidth;
        verifyPanel?.classList.add("shake");
        return;
      }
      verificationMessage("Verified.","success");
      completeVerification();
    });

    const resend=$("#resend-code");
    if(resend)resend.addEventListener("click",async()=>{
      if(!verificationEmail)return;
      verificationMessage("Sending a fresh code…","loading");
      const result=await supabase.auth.resendVerificationCode(verificationEmail);
      if(result?.error){verificationMessage(result.error.message,"error");return;}
      verificationMessage("New code sent. Check your inbox.","success");
      startResendTimer(60);
    });

    const changeEmail=$("#change-email");
    if(changeEmail)changeEmail.addEventListener("click",()=>{
      clearInterval(resendTimer);
      if(verifyPanel)verifyPanel.hidden=true;
      if(forms)forms.classList.remove("auth-success");
      signUp.hidden=false;
      tabs.forEach(button=>button.classList.toggle("active",button.dataset.mode==="signup"));
      $("#signup-email").value=verificationEmail;
      $("#signup-email").focus();
    });

    signIn.addEventListener("submit",async e=>{
      e.preventDefault();
      const button=signIn.querySelector("button[type='submit']");
      const box=$("#sign-in-status");
      setStatus(box,"","");setBusy(button,true,"Checking account…");
      const result=await withTimeout(
        supabase.auth.signInWithPassword({
          email:$("#signin-email").value.trim(),
          password:$("#signin-password").value
        }),
        10000,
        {error:{message:"The sign-in service took too long to respond. Try again."}}
      );
      setBusy(button,false);
      if(result?.error){
        const code=result.data?.code;
        if(result.error.status===404){
          setStatus(box,"No PAPARAZZI account found for that email.","error");
          toast("No account found. Create one to join PAPARAZZI.","error");
          const switchBtn=tabs.find(x=>x.dataset.mode==="signup");
          if(switchBtn)switchBtn.click();
          $("#signup-email").value=$("#signin-email").value.trim();
          return;
        }
        if(result.error.status===403&&code==="EMAIL_NOT_VERIFIED"){
          showVerification(result.data?.email||$("#signin-email").value.trim());
          verificationMessage("Your email is not verified yet. We sent a fresh code.","error");
          return;
        }
        setStatus(box,result.error.status===401
          ?"Your password doesn't match. Check it and try again."
          :result.error.message,"error");
        return;
      }
      setStatus(box,"","");toast("Welcome back.","success");
      signIn.classList.add("auth-complete");
      const signedProfile=(await supabase.from("paparazi_profiles").select("*").eq("id",result.data?.user?.id).maybeSingle()).data;
      setTimeout(()=>location.href=(authNext||(signedProfile?.is_paparazzi?"studio.html":"index.html?welcome=1")),650);
    });

    const signupStep1=$("#signup-step-1"),signupStep2=$("#signup-step-2"),signupContinue=$("#signup-continue"),signupBack=$("#signup-back");
    const setSignupState=step=>{if(signupStep1)signupStep1.hidden=step!==1;if(signupStep2)signupStep2.hidden=step!==2;$(".signup-state-dot").forEach(dot=>dot.classList.toggle("active",Number(dot.dataset.step)===step));};
    if(signupContinue)signupContinue.addEventListener("click",()=>{const name=$("#signup-name"),email=$("#signup-email");if(!name?.reportValidity()||!email?.reportValidity())return;setSignupState(2);$("#signup-password")?.focus();});
    if(signupBack)signupBack.addEventListener("click",()=>setSignupState(1));
    setSignupState(1);

    signUp.addEventListener("submit",async e=>{
      e.preventDefault();
      const box=$("#sign-up-status"),button=signUp.querySelector("button[type='submit']");
      const name=$("#signup-name").value.trim(),email=$("#signup-email").value.trim(),password=$("#signup-password").value;
      if(password!==$("#signup-confirm").value){setStatus(box,"Your passwords don't match yet.","error");return;}
      if(password.length<8){setStatus(box,"Use at least 8 characters for the password.","error");return;}
      setStatus(box,"","");setBusy(button,true,"Creating your account…");
      const result=await withTimeout(
        supabase.auth.signUp({email,password,name,accepted_terms:$("#signup-terms")?.checked,accepted_privacy:$("#signup-terms")?.checked,accepted_community_rules:$("#signup-community")?.checked}),
        12000,
        {error:{message:"Account creation took too long. Try again."}}
      );
      setBusy(button,false);
      if(result?.error){
        if(result.error.status===409){
          setStatus(box,"That email already has a PAPARAZZI account. Sign in instead.","error");
          toast("Account already exists.","error");
          const switchBtn=tabs.find(x=>x.dataset.mode==="signin");
          if(switchBtn)switchBtn.click();
          $("#signin-email").value=email;
          $("#signin-password").focus();
        }else setStatus(box,result.error.message,"error");
        return;
      }
      const profileUser=result?.data?.user;
      if(profileUser&&name){
        const profile=await ensureProfile(profileUser);
        if(profile&&profile.display_name!==name)await supabase.from("paparazi_profiles").update({display_name:name});
      }
      toast("Account created. Check your inbox.","success");
      showVerification(email);
      verificationMessage("Account created. Your six-digit verification code is on its way.","success");
    });

    const reset=$("#reset-password");
    if(reset)reset.addEventListener("click",async()=>{
      const email=$("#signin-email").value.trim(),box=$("#sign-in-status");
      if(!email){setStatus(box,"Enter your email first, then tap forgot password.","error");return;}
      setStatus(box,"Password recovery isn't available yet. Your account is safe; use your existing password for now.","error");
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

  document.addEventListener("DOMContentLoaded",()=>installImageWatermarks());
  function initStateForms(){
    $$("[data-state-form]").forEach(form=>{
      if(form.dataset.stateReady==="1")return;
      form.dataset.stateReady="1";
      const steps=$$(".state-step",form),dots=$$("[data-state-dot]",form),count=$("[data-state-count]",form);
      let current=0;
      const paint=()=>{steps.forEach((step,i)=>step.hidden=i!==current);dots.forEach((dot,i)=>dot.classList.toggle("active",i===current));if(count)count.textContent=(current+1)+" / "+steps.length;};
      form.addEventListener("click",e=>{
        const next=e.target.closest("[data-state-next]"),back=e.target.closest("[data-state-back]");
        if(!next&&!back)return;e.preventDefault();
        if(next){const fields=$$("input,textarea,select",steps[current]).filter(el=>!el.disabled&&el.type!=="file");const invalid=fields.find(el=>!el.checkValidity());if(invalid){invalid.reportValidity();return;}if(current<steps.length-1)current++;}
        else if(current>0)current--;
        paint();steps[current]?.querySelector("input,textarea,select")?.focus({preventScroll:true});
      });paint();
    });
  }
  const _observeImages=new MutationObserver(()=>installImageWatermarks());
  if(document.body)_observeImages.observe(document.body,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",async()=>{
    hideSplash();
    initMotion();
    initShell();
    initStateForms();

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