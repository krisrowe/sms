const assert = require('assert');

describe('Sms', function() {
  it('should send', async function() {
    const message = {
      data: "ewogICJ0byI6ICI0NjktMjIyLTIwMDUiLAogICJib2R5IjogIllvdSByb2NrISIKfQ=="
    }
    const indexModule = require('../index');
    // Use async/await and try/catch for error handling
    try {
      const result = await indexModule.send(message, {});
      assert.equal(result, true);
    } catch (err) {
      assert.fail(err);
    }
  });

  after(function(done) {
    // Wait for a bit for async calls to Cloud Logging to complete. 
    setTimeout(done, 2000);
  });
});
