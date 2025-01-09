using System;
using System.Collections.Generic;
using System.Net;
using System.Web;
using System.Web.Mvc;
using ZendeskApi_v2;
using ZendeskApi_v2.Models.Constants;
using ZendeskApi_v2.Models.Shared;
using ZendeskApi_v2.Models.Tickets;
using ZendeskApi_v2.Models.Users;

namespace AcmeCorp.Controller
{
    public class ZendeskController
    {
        [HttpPost]
        public ActionResult createContact(CreateContactModel model, string returnUrl)
        {
            var api = new ZendeskApi();

            if (ModelState.IsValid)
            {
                var contact = new User()
                {
                    Name = model.Name.ToString(),
                    Email = model.email.ToString()
                };

                try
                {
                    var userData = api.Users.CreateUser(contact);
                    return new RedirectResult(api.Url + "/users/" + userData.id);
                }
                catch (Exception ex)
                {
                    Log.Error(ex.InnerException.Message);
                }
            }

            return View(model);
        }
    }
}
