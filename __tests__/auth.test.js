const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const expect = chai.expect;

chai.use(chaiHttp);

describe('Auth API', () => {
  it('should return JWT token on login', (done) => {
    chai.request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('token');
        done();
      });
  });
});
