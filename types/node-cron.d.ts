declare module 'node-cron' {
    type CronCommand = () => void;
  
    interface ScheduleOptions {
      scheduled?: boolean;
      timezone?: string;
    }
  
    interface ScheduledTask {
      start: () => void;
      stop: () => void;
      destroy: () => void;
      getStatus: () => string;
    }
  
    function schedule(
      cronExpression: string,
      func: CronCommand,
      options?: ScheduleOptions
    ): ScheduledTask;
  
    function validate(cronExpression: string): boolean;
  
    export { schedule, ScheduledTask, validate };
    export default { schedule, validate };
  }
  