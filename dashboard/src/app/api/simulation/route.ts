import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Store process reference globally (in dev only)
let producerProcess: any = null;

export async function POST(req: Request) {
  try {
    const { action } = await req.json();
    
    if (action === 'start') {
      if (producerProcess) {
        return NextResponse.json({ message: 'Simulation already running' });
      }
      
      const scriptPath = path.resolve('../execution/01_pubsub_producer.py');
      console.log('Starting producer:', scriptPath);
      
      // Use python from environment (assuming 'python' or 'python3' is in path)
      producerProcess = spawn('python', [scriptPath], {
        cwd: path.resolve('..'), // Run from root project dir
        stdio: 'ignore' // detach? or pipe logs?
      });
      
      return NextResponse.json({ message: 'Simulation started', pid: producerProcess.pid });
      
    } else if (action === 'stop') {
      if (producerProcess) {
        producerProcess.kill();
        producerProcess = null;
        return NextResponse.json({ message: 'Simulation stopped' });
      }
      return NextResponse.json({ message: 'No simulation running' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Simulation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: producerProcess ? 'running' : 'stopped' });
}
