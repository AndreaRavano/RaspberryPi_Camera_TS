import * as child from 'child_process';
import * as fs from 'fs';
import { EventEmitter } from 'events';

let chalk   = require('chalk');

interface piCamArgs {
    output?: string;
    // filename?: string;
    width?: number;
    height?: number;
    timeout?: number;
    verbose?: boolean;
    vflip?: boolean;
    hflip?: boolean;
    preview?: boolean;
    nopreview?: boolean;
    fullScreen?: boolean;
    awb?: string;
    quality?: number;
    /**
     Set Automatic White Balance (AWB) mode
     --------------------------------------------------
     -off            Turn off white balance calculation
     -auto           Automatic mode (default)
     -sun            Sunny mode
     -cloud          Cloudy mode
     -shade          Shade mode
     -tungsten       Tungsten lighting mode
     -fluorescent    Fluorescent lighting mode
     -incandescent   Incandescent lighting mode
     -flash          Flash mode
     -horizon        Horizon mode
     */
    [key: string]: string|number|boolean;
}

class MyEmitter extends EventEmitter {
    constructor(){
        super();
        this.emit('ready');
    }
}


export class RaspiCam {

    private process: child.ChildProcess ;
    public output: string;
    // public filename: string;
    private options: piCamArgs;
    public raspiCamEvents: MyEmitter = new MyEmitter();

    constructor( args: piCamArgs ){
        this.output = args.output || './';
        // this.filename = args.filename || ''+Date.now();
        this.options = args;


    }

    photo():void{

        console.log(chalk.blue('piCam calling raspicam'));
        let command: string = 'raspistill';
        let args = this.setSpawnArgs();

        console.log(chalk.blue(command + ' ' + args.join(" ")));
        this.process = child.spawn(command, args);
        this.addChild_ProcessListeners();
    }

    video():void{

        console.log(chalk.blue('piCam calling raspivid'));
        let command: string = 'raspivid';
        let args: string[] = this.setSpawnArgs();

        console.log(chalk.blue(command + ' ' + args.join(" ")));
        this.process = child.spawn(command, args);
        this.addChild_ProcessListeners();
    }

    get( arg: string ): string|number|boolean {
        return this.options[arg]
    }

    set( arg: string, value: string|number|boolean ): void {
        this.options[arg] = value;

        if( arg === 'output' || 'path' || 'Path' ){
            this.output = this.options.output;
        }// else if ( arg === 'filename' || 'name' ){
        //     this.filename = this.options.filename;
        // }
    }

    addChild_ProcessListeners():void{

        this.process.stdout.on('data', (data: string) => {
            console.log(`stdout: ${data}`);
        });

        this.process.stderr.on('data', (data:string) => {
            console.log(`stderr: ${data}`);
        });

        this.process.on('close', (code: string) => {
            console.log(`child process exited with code ${code}`);
            let filename = this.output;
            this.raspiCamEvents.emit('raspicam closed', filename);
        });
    }

    directoryListener():void{

        fs.watch(this.output, function(event, filename) {
            //rename is called once, change is called 3 times, so check for rename to elimate duplicates
            if (event === "rename") {
                console.log('piCam watching directory: file renamed: '+filename);
                this.emit("read", null, new Date().getTime(), filename);
            } else {
                console.log('piCam watching dir:  ' + event);
                this.emit(event, null, new Date().getTime(), filename);
            }
        })
    }

    setSpawnArgs(): string[]{

        let args: string[] = [];
        for (var key in this.options){
            if(typeof this.options[key] === "boolean" && this.options[key] === true){
                let arg1 = '--'+key;
                args.push(arg1);
            } else if (typeof this.options[key] !== "boolean") {
                let arg1 = '--'+key;
                let arg2 = this.options[key].toString();
                args.push(arg1);
                args.push(arg2);
            }
        }
        return args
    }
}