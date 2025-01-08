using System;
using System.Collections.Generic;
using System.Net;
using System.Web;
using System.Web.Mvc;
using AcmeCorp.Helpers;

namespace AcmeCorp.Controller
{
    public class AuthController
    {
        [HttpPost]
        public ActionResult LogOn(LogOnModel model, string returnUrl)
        {
            if (ModelState.IsValid)
            {
                if (AuthHelper.ValidateUser(model.UserName, model.Password))
                {
                    AuthHelper.SignIn(model.UserName, model.RememberMe);
                    if (!String.IsNullOrWhiteSpace(returnUrl))
                    {
                        return Redirect(HttpUtility.UrlDecode(returnUrl));
                    }
                    else
                    {
                        return RedirectToAction("Index", "Home");
                    }
                }
                else
                {
                    ModelState.AddModelError("", "The user name or password provided is incorrect.");
                }
            }

            return View(model);
        }
    }
}
