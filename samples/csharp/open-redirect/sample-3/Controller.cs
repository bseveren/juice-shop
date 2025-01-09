using System;
using System.Collections.Generic;
using System.Net;
using System.Web;
using System.Web.Mvc;
using AcmeCorp.Helpers;

namespace AcmeCorp.Controller
{
    public class OrderController {
        [HttpGet]
        public ActionResult ProductSearch(string query)
        {
            UrlHelper url = new UrlHelper(HttpContext.Current.Request.RequestContext);
            string searchResultUrl = url.Action("SearchAction", "ProductSearch", new { query = query });
            return Redirect(searchResultUrl);
        }
    }
}
