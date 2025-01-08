export async function fetchWithToken( method, url,data )  {
    try {
        const headers = await getJwtToken();
        headers['Content-Type'] = 'application/json';
        if(method == 'post'){
            let res = await axios.post(url, data,{headers})            
            return res?.data || {}
        }else if(method ==  'put'){
            let res = await axios.put(url, data,{headers})  
            return res?.data || {}
        }
        else{
            let res=  await axios.get(url,{headers})
            return res?.data || {}
        }    
    }catch(e){
        return e?.response?.data || {error:"An unexpected error occured.Please try again later!"}
    }
}
