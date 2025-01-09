        });
      });
    } else {
      res.redirect('/profiel-aanvullen?error=passwords_match');
    }
  } else {
    Users.update(req.user._id, req.body, (err) => {
      if (err) console.log(err);
      console.log('PASSWORD CHANGED');
      res.redirect('/?message=profiel_ingevuld');
    });
  }
});


router.post('/profilepic', Auth.isLoggedIn(), upload.single('avatar'), (req, res) => {
  if (req.file && req.file.path) {
    req.body.profilePicture = req.file.path.split('public')[1];
    Users.update(req.user._id, req.body, (err) => {
      if (err) console.log(err);
      res.redirect('/settings');
    });
  } else {
    Users.update(req.user._id, req.body, (err) => {
      if (err) console.log(err);
      res.redirect('/settings');
    });
  }
});


router.post('/invite', async (req, res) => {
  const inviteId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  req.body.isAdmin = true;
  Users.create(req.body, inviteId, () => {
    mailSender.sentInvite(req.body, inviteId);
    res.json({
      message: 'Er werd een uitnodiging verzonden.',
    });
  });
});


// /api/v1/matching/answerInvite?inviteId={YOURID}&answer={YES||NO}
router.get('/answerInvite', (req, res) => {
  if (req.query.inviteId && req.query.answer) {
    Users.answerInvite(req.query.inviteId, req.query.answer, (err, result) => {
      console.log('the result', result.success);
      if (result.success) {
        res.redirect(`/complete-profile/${req.query.inviteId}`);
      } else {
        res.redirect(`/?error=${result.message}`);
      }
    });
  } else {
    res.json({
      success: false,
      message: 'Not all parameters are set.',
    });
  }
});


// voorlopige router naar detail pagina
router.get('/customers/:customerId', Auth.check(), (req, res) => {
  Customers.detail(req.params.customerId, (err, customer) => {
    if (customer && customer._id) {
      res.render('detail', {
        me: req.user,
        env,
        customer,
        moment,
      });
    } else {
      res.redirect('/?error=customer-not-found');
    }
  });
});


router.get('/customers/:customerId/json', Auth.check(), (req, res) => {
  Customers.detail(req.params.customerId, (err, customer) => {
    res.json({
      success: true,
      customer,
    });
  });
});


router.get('/customers/:customerId/download', Auth.check(), (req, res) => {
  Customers.detail(req.params.customerId, (err, customer) => {
    res.download(customer.migrations[customer.migrations.length - 1].filepath);
  });
});


router.get('/delete/:customerId/:migrationId', Auth.check(), (req, res) => {
  Migrations.remove(req.params.migrationId, (err, migration) => {
    console.log(migration);
    if (err) { console.log(err); }
    res.redirect(`/customers/${req.params.customerId}`);
  });
});
