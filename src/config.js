const Conf = require('conf');

const config = new Conf({
  projectName: 'local-tunnel-cli'
});

function saveConfig(tunnelConfig) {
  const tunnels = config.get('tunnels') || [];
  tunnels.push(tunnelConfig);
  config.set('tunnels', tunnels);
}

function loadConfig() {
  return config.get('tunnels') || [];
}

module.exports = {
  saveConfig,
  loadConfig
};
