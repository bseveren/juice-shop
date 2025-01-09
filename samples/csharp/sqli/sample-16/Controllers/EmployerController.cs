using Microsoft.AspNetCore.Mvc;
using Acme.Models;
using Acme.Repositories;

namespace Acme.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployerController : ControllerBase
    {
        // GET: api/Employer
        [HttpGet]
        public ActionResult<EmployerModel> GetEmployerByClient(
            string user, string name, string vatNumber, string id)
        {
            var employer = EmployerRepository.GetEmployerByClient(user, name, vatNumber, id);
            if (employer != null)
            {
                return Ok(employer);
            }
            else
            {
                return NotFound();
            }
        }
    }
}
