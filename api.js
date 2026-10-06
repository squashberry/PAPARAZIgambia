(function(){
  "use strict";

  const cfg = window.PAPARAZI_CONFIG || {};
  const API_BASE = String(cfg.apiBase || "").replace(/\/+$/,"");
  const AUTH_EVENT = "paparazzi-auth-change";

  function makeError(message, status){
    return { message: message || "Something went wrong.", status: status || 0 };
  }

  async function request(path, options={}){
    const headers = new Headers(options.headers || {});
    headers.set("Accept","application/json");
    if(options.body !== undefined && !(options.body instanceof FormData)){
      headers.set("Content-Type","application/json");
    }

    // Telegram Mini Apps do not reliably provide third-party cookies.
    // Forward the signed init data so the API can authenticate the Telegram user
    // without depending on a browser session cookie.
    const telegramInitData=String(window.PAPARAZZI_TELEGRAM?.initData||"").trim();
    if(telegramInitData)headers.set("X-Telegram-Init-Data",telegramInitData);

    if(options.write)headers.set("X-Paparazzi-Request","1");

    let response;
    try{
      response = await fetch(API_BASE + path,{
        ...options,
        headers,
        credentials:"include"
      });
    }catch(error){
      return { data:null, error:makeError(error?.message || "Network request failed.") };
    }

    let payload=null;
    try{
      payload=await response.json();
    }catch(_){}

    if(!response.ok){
      return {
        data:payload?.data ?? payload ?? null,
        error:makeError(payload?.error || payload?.message || ("Request failed ("+response.status+")."),response.status)
      };
    }
    return { data:payload, error:null };
  }

  function dispatchAuth(){
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  }

  class QueryBuilder{
    constructor(table){
      this.table=table;
      this.filters=[];
      this._order=null;
      this._limit=null;
      this._select=null;
      this._operation="select";
      this._payload=null;
    }

    select(columns){
      this._select=columns;
      return this;
    }

    eq(column,value){
      this.filters.push([column,value]);
      return this;
    }

    order(column,options={}){
      this._order={column,options};
      return this;
    }

    limit(value){
      this._limit=value;
      return this;
    }

    insert(payload){
      this._operation="insert";
      this._payload=payload;
      return this;
    }

    update(payload){
      this._operation="update";
      this._payload=payload;
      return this;
    }

    maybeSingle(){
      return this._execute(true,false);
    }

    single(){
      return this._execute(true,true);
    }

    then(resolve,reject){
      return this._execute(false,false).then(resolve,reject);
    }

    async _execute(single,strictSingle){
      if(this.table==="paparazi_articles"){
        if(this._operation==="insert"){
          const result=await request("/api/articles",{method:"POST",body:JSON.stringify(this._payload),write:true});
          return normalize(result);
        }

        const params=new URLSearchParams();
        for(const [key,value] of this.filters){
          if(key==="slug"||key==="status"||key==="author_id")params.set(key,String(value));
        }
        if(this._order?.column)params.set("order",this._order.column);
        if(this._limit)params.set("limit",String(this._limit));
        const result=await request("/api/articles?"+params.toString());
        if(result.error)return result;
        const data=result.data?.data ?? (single ? null : []);
        if(single && Array.isArray(data)){
          return {data:data[0]||null,error:null};
        }
        return {data,error:null};
      }

      if(this.table==="paparazi_profiles"){
        if(this._operation==="insert"){
          const result=await request("/api/profile",{method:"POST",body:JSON.stringify({
            display_name:this._payload?.display_name||null
          }),write:true});
          return normalize(result);
        }

        if(this._operation==="update"){
          const result=await request("/api/profile",{method:"PATCH",body:JSON.stringify(this._payload||{}),write:true});
          return normalize(result);
        }

        const result=await request("/api/profile/me");
        return normalize(result);
      }

      if(this.table==="paparazi_submissions"){
        if(this._operation==="insert"){
          const result=await request("/api/submissions",{method:"POST",body:JSON.stringify(this._payload||{}),write:true});
          return normalize(result);
        }
      }

      return {data:single?null:[],error:null};
    }
  }

  function normalize(result){
    return {
      data:result?.data?.data ?? result?.data ?? null,
      error:result?.error || null
    };
  }

  const client={
    auth:{
      async getSession(){
        const result=await request("/api/auth/session");
        return {data:{session:result.data?.session||null},error:result.error||null};
      },

      onAuthStateChange(callback){
        const handler=async()=>{
          const sessionResult=await client.auth.getSession();
          callback("SIGNED_IN",sessionResult.data.session);
        };
        window.addEventListener(AUTH_EVENT,handler);
        return {
          data:{
            subscription:{
              unsubscribe(){
                window.removeEventListener(AUTH_EVENT,handler);
              }
            }
          }
        };
      },

      async signInWithPassword(credentials){
        const result=await request("/api/auth/signin",{
          method:"POST",
          body:JSON.stringify(credentials),
          write:true
        });
        if(!result.error)dispatchAuth();
        return {
          data:result.data||null,
          error:result.error||null
        };
      },

      async signInWithTelegram(){
        const initData=String(window.PAPARAZZI_TELEGRAM?.initData||"").trim();
        if(!initData)return {data:null,error:makeError("Open PAPARAZZI from Telegram to use Telegram sign-in.")};
        const result=await request("/api/auth/telegram",{
          method:"POST",
          body:JSON.stringify({initData}),
          write:true
        });
        if(!result.error)dispatchAuth();
        return {data:result.data||null,error:result.error||null};
      },

      async signUp(credentials){
        const result=await request("/api/auth/signup",{method:"POST",body:JSON.stringify({email:credentials.email,password:credentials.password,name:credentials.options?.data?.display_name||credentials.name||"",accepted_terms:!!credentials.accepted_terms,accepted_privacy:!!credentials.accepted_privacy,accepted_community_rules:!!credentials.accepted_community_rules}),write:true});
        return {data:result.data?.user?{user:result.data.user,session:null,verification_required:!!result.data.verification_required}:null,error:result.error||null};
      },

      async verifyEmailCode({email,code}){
        const result=await request("/api/auth/verify-email",{method:"POST",body:JSON.stringify({email,code}),write:true});
        if(!result.error)dispatchAuth();
        return {data:result.data?.user?{user:result.data.user,session:result.data.session?{}:null}:null,error:result.error||null};
      },

      async resendVerificationCode(email){
        const result=await request("/api/auth/resend-verification",{method:"POST",body:JSON.stringify({email}),write:true});
        return {data:result.data||null,error:result.error||null};
      },

      async resetPasswordForEmail(email){
        const result=await request("/api/auth/forgot-password",{
          method:"POST",
          body:JSON.stringify({email}),
          write:true
        });
        return {data:result.data||null,error:result.error||null};
      },



      async getArticles({authorId=null,status="published",limit=50,tag="",offset=0,category=""}={}){
        const q=new URLSearchParams();
        if(authorId)q.set("author_id",authorId);
        if(status)q.set("status",status);
        if(tag)q.set("tag",String(tag).replace(/^#/,""));
        if(offset)q.set("offset",String(Math.max(0,Number(offset)||0)));
        if(category && String(category).toLowerCase()!=="all")q.set("category",String(category));
        q.set("limit",String(limit));
        return normalize(await request("/api/articles?"+q.toString()));
      },

      async updateArticle(id,payload){
        return normalize(await request("/api/articles/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify(payload),write:true}));
      },

      async getMyArticles(){
        return normalize(await request("/api/articles?author_id=me&status=all&limit=50"));
      },

      async getMyProfile(){
        return normalize(await request("/api/profile/me"));
      },

      async updateMyProfile(payload){
        return normalize(await request("/api/profile/me",{method:"PATCH",body:JSON.stringify(payload),write:true}));
      },

      async getPublicProfile(username){
        return normalize(await request("/api/profiles/"+encodeURIComponent(username)));
      },

      async applyContributor(payload){
        return normalize(await request("/api/contributors/apply",{method:"POST",body:JSON.stringify(payload),write:true}));
      },

      async getMyPaparazzi(){ return normalize(await request("/api/celebrity-paparazzi/me")); },
      async addMyPaparazzi(name){ return normalize(await request("/api/celebrity-paparazzi",{method:"POST",body:JSON.stringify({celebrity_name:name}),write:true})); },
      async removeMyPaparazzi(id){ return normalize(await request("/api/celebrity-paparazzi/"+encodeURIComponent(id),{method:"DELETE",write:true})); },
      async attachStoryPaparazzi(articleId,celebrityPaparazziId){ return normalize(await request("/api/articles/"+encodeURIComponent(articleId)+"/paparazzi",{method:"POST",body:JSON.stringify({celebrity_paparazzi_id:celebrityPaparazziId}),write:true})); },

      async follow(username){
        return normalize(await request("/api/follows/"+encodeURIComponent(username),{method:"POST",write:true}));
      },

      async unfollow(username){
        return normalize(await request("/api/follows/"+encodeURIComponent(username),{method:"DELETE",write:true}));
      },

      async getFollowing(){
        return normalize(await request("/api/follows"));
      },

      async getNotificationPreferences(){
        return normalize(await request("/api/notification-preferences"));
      },

      async updateNotificationPreferences(payload){
        return normalize(await request("/api/notification-preferences",{method:"PATCH",body:JSON.stringify(payload),write:true}));
      },

      async getNotifications(){
        return normalize(await request("/api/notifications"));
      },

      async markNotificationsRead(id=null){
        return normalize(await request("/api/notifications/read",{method:"POST",body:JSON.stringify(id?{id}:{}),write:true}));
      },

      async getStoryDesk(){
        return normalize(await request("/api/story-desk"));
      },

      async claimStory(submissionId){
        return normalize(await request("/api/story-desk/claim",{method:"POST",body:JSON.stringify({submission_id:submissionId}),write:true}));
      },

      async workStory(submissionId){
        return normalize(await request("/api/story-desk/"+encodeURIComponent(submissionId)+"/work",{method:"POST",body:JSON.stringify({}),write:true}));
      },

      async getTelegramConnectCode(){ return normalize(await request("/api/telegram/connect-code",{method:"POST",write:true})); },
      async getActiveAd(placement="story"){ return normalize(await request("/api/ads/active?placement="+encodeURIComponent(placement))); },
      async recordAdEvent(id,type="impression"){ return normalize(await request("/api/ads/"+encodeURIComponent(id)+"/event",{method:"POST",body:JSON.stringify({type}),write:true})); },

      async listApiKeys(){
        return normalize(await request("/api/api-keys"));
      },

      async createApiKey(name,scopes){
        return normalize(await request("/api/api-keys",{method:"POST",body:JSON.stringify({name,scopes}),write:true}));
      },

      async revokeApiKey(id){
        return normalize(await request("/api/api-keys/"+encodeURIComponent(id),{method:"DELETE",write:true}));
      },

      async signOut(){
        const result=await request("/api/auth/signout",{
          method:"POST",
          write:true
        });
        dispatchAuth();
        return {error:result.error||null};
      }
    },

    // Compatibility aliases for page-level scripts and older contributor pages.
    getMyProfile(...args){ return client.auth.getMyProfile(...args); },
    updateMyProfile(...args){ return client.auth.updateMyProfile(...args); },
    applyContributor(...args){ return client.auth.applyContributor(...args); },
    getPublicProfile(...args){ return client.auth.getPublicProfile(...args); },
    getArticles(...args){ return client.auth.getArticles(...args); },
    updateArticle(...args){ return client.auth.updateArticle(...args); },
    getFollowing(...args){ return client.auth.getFollowing(...args); },
    getNotificationPreferences(...args){ return client.auth.getNotificationPreferences(...args); },
    updateNotificationPreferences(...args){ return client.auth.updateNotificationPreferences(...args); },
    getNotifications(...args){ return client.auth.getNotifications(...args); },
    markNotificationsRead(...args){ return client.auth.markNotificationsRead(...args); },
    getStoryDesk(...args){ return client.auth.getStoryDesk(...args); },
    claimStory(...args){ return client.auth.claimStory(...args); },
    workStory(...args){ return client.auth.workStory(...args); },
    getTelegramConnectCode(...args){ return client.auth.getTelegramConnectCode(...args); },
    from(table){
      return new QueryBuilder(table);
    },

    storage:{
      from(bucket){
        return {
          async upload(path,file,options={}){
            const form=new FormData();
            form.append("file",file,file.name);
            form.append("bucket",bucket);
            form.append("folder",path.replace(/\/[^/]+$/,""));
            const result=await request("/api/media/upload",{
              method:"POST",
              body:form,
              write:true
            });
            return {
              data:result.data?.data ? {path:result.data.data.path}:null,
              error:result.error||null
            };
          },

          getPublicUrl(path){
            const url=API_BASE+"/media/"+String(path).split("/").map(encodeURIComponent).join("/");
            return {data:{publicUrl:url}};
          }
        };
      }
    }
  };

  window.PAPARAZZI_API=client;
  window.PAPARAZZI={supabase:client};
})();
