#!/usr/bin/env node
const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const TunnelManager = require('../src/tunnelManager');
const { saveConfig, loadConfig } = require('../src/config');

async function promptForServerDetails() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'localPort',
      message: 'Enter the local port to tunnel:',
      default: '3000',
      validate: input => {
        const port = parseInt(input);
        if (isNaN(port) || port <= 0 || port > 65535) {
          return 'Please enter a valid port number (1-65535)';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'subdomain',
      message: 'Enter desired subdomain (leave empty for random):',
      default: '',
      validate: input => {
        if (input && !/^[a-z0-9-]+$/.test(input)) {
          return 'Subdomain can only contain lowercase letters, numbers, and hyphens';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'serverIp',
      message: 'Enter tunnel server IP/domain:',
      default: 'dfanso.dev',
      validate: input => {
        if (!input) {
          return 'Server IP/domain is required';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'serverPort',
      message: 'Enter tunnel server port:',
      default: '8080',
      validate: input => {
        const port = parseInt(input);
        if (isNaN(port) || port <= 0 || port > 65535) {
          return 'Please enter a valid port number (1-65535)';
        }
        return true;
      }
    }
  ]);

  return answers;
}

async function main() {
  program
    .version('1.0.0')
    .description('Create secure tunnels to local servers');

  program
    .command('start')
    .description('Start a new tunnel')
    .action(async () => {
      try {
        // Get configuration first, before starting the spinner
        const config = await promptForServerDetails();
        
        // Start spinner after getting configuration
        const spinner = ora('Setting up tunnel...').start();
        
        console.log(chalk.cyan(`\nConnecting to tunnel server at ${config.serverIp}:${config.serverPort}...`));
        const tunnelManager = new TunnelManager();
        
        try {
          const tunnelInfo = await tunnelManager.addTunnel(config);
          spinner.succeed(chalk.green('Tunnel created successfully!'));
          
          // Format the URL correctly
          const subdomain = tunnelInfo.subdomain || config.subdomain;
          const tunnelUrl = `https://${subdomain}.${config.serverIp}`;
          
          console.log(chalk.cyan(`\nTunnel Details:`));
          console.log(chalk.gray(`Local server: http://localhost:${config.localPort}`));
          console.log(chalk.gray(`Tunnel server: ${config.serverIp}:${config.serverPort}`));
          console.log(chalk.cyan(`Public URL: ${tunnelUrl}`));
          
          // Save successful configuration
          saveConfig({
            ...config,
            subdomain: subdomain,
            timestamp: new Date().toISOString()
          });
          
          // Keep the process running
          console.log(chalk.yellow('\nTunnel is active. Press Ctrl+C to stop'));
          
          // Handle graceful shutdown
          process.on('SIGINT', async () => {
            console.log(chalk.cyan('\nShutting down tunnel...'));
            await tunnelManager.stopAll();
            process.exit(0);
          });
          
        } catch (error) {
          spinner.fail(chalk.red('Failed to create tunnel'));
          console.error(chalk.red('\nError details:'), error.message);
          
          if (error.message.includes('ECONNREFUSED') || error.message.includes('Connection refused')) {
            console.log(chalk.yellow('\nTroubleshooting tips:'));
            console.log('1. Check if the tunnel server is running at the specified address');
            console.log(`2. Verify that ${config.serverIp}:${config.serverPort} is accessible`);
            console.log('3. Check your firewall settings');
            console.log('4. If using a domain, verify DNS resolution');
          } else if (error.message.includes('ECONNRESET') || error.message.includes('Connection reset')) {
            console.log(chalk.yellow('\nTroubleshooting tips:'));
            console.log('1. The connection was reset by the server');
            console.log('2. Check if the server supports WebSocket connections');
            console.log('3. Try using a different port or protocol (ws:// or wss://)');
          }
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red('Error during setup:'), error.message);
        process.exit(1);
      }
    });

  program
    .command('list')
    .description('List all active tunnels')
    .action(() => {
      const tunnelManager = new TunnelManager();
      const tunnels = tunnelManager.listTunnels();
      if (tunnels.length === 0) {
        console.log(chalk.yellow('No active tunnels'));
        return;
      }
      
      console.log(chalk.cyan('Active tunnels:'));
      tunnels.forEach(tunnel => {
        console.log(chalk.green(`- ${tunnel.subdomain}.${tunnel.serverIp} -> localhost:${tunnel.localPort}`));
      });
    });

  program
    .command('stop')
    .description('Stop a tunnel')
    .action(async () => {
      const tunnelManager = new TunnelManager();
      const tunnels = tunnelManager.listTunnels();
      
      if (tunnels.length === 0) {
        console.log(chalk.yellow('No active tunnels to stop'));
        return;
      }

      const { tunnelToStop } = await inquirer.prompt([
        {
          type: 'list',
          name: 'tunnelToStop',
          message: 'Select tunnel to stop:',
          choices: tunnels.map(t => ({
            name: `${t.subdomain}.${t.serverIp} -> localhost:${t.localPort}`,
            value: t.id
          }))
        }
      ]);

      const spinner = ora('Stopping tunnel...').start();
      try {
        await tunnelManager.stopTunnel(tunnelToStop);
        spinner.succeed(chalk.green('Tunnel stopped successfully'));
      } catch (error) {
        spinner.fail(chalk.red('Failed to stop tunnel'));
        console.error(error);
      }
    });

  program.parse(process.argv);
}

main();
