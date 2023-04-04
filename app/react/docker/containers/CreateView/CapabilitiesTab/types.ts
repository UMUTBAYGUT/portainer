export interface Capability {
  key: string;
  description: string;
  default?: boolean;
}

const capDesc: Record<string, Capability> = {
  SETPCAP: {
    key: 'SETPCAP',
    description: 'Modify process capabilities.',
    default: true,
  },
  MKNOD: {
    key: 'MKNOD',
    description: 'Create special files using mknod(2).',
    default: true,
  },
  AUDIT_WRITE: {
    key: 'AUDIT_WRITE',
    description: 'Write records to kernel auditing log.',
    default: true,
  },
  CHOWN: {
    key: 'CHOWN',
    description: 'Make arbitrary changes to file UIDs and GIDs (see chown(2)).',
    default: true,
  },
  NET_RAW: {
    key: 'NET_RAW',
    description: 'Use RAW and PACKET sockets.',
    default: true,
  },
  DAC_OVERRIDE: {
    key: 'DAC_OVERRIDE',
    description: 'Bypass file read, write, and execute permission checks.',
    default: true,
  },
  FOWNER: {
    key: 'FOWNER',
    description:
      'Bypass permission checks on operations that normally require the file system UID of the process to match the UID of the file.',
    default: true,
  },
  FSETID: {
    key: 'FSETID',
    description:
      'Don’t clear set-user-ID and set-group-ID permission bits when a file is modified.',
    default: true,
  },
  KILL: {
    key: 'KILL',
    description: 'Bypass permission checks for sending signals.',
    default: true,
  },
  SETGID: {
    key: 'SETGID',
    description:
      'Make arbitrary manipulations of process GIDs and supplementary GID list.',
    default: true,
  },
  SETUID: {
    key: 'SETUID',
    description: 'Make arbitrary manipulations of process UIDs.',
    default: true,
  },
  NET_BIND_SERVICE: {
    key: 'NET_BIND_SERVICE',
    description:
      'Bind a socket to internet domain privileged ports (port numbers less than 1024).',
    default: true,
  },
  SYS_CHROOT: {
    key: 'SYS_CHROOT',
    description: 'Use chroot(2), change root directory.',
    default: true,
  },
  SETFCAP: {
    key: 'SETFCAP',
    description: 'Set file capabilities.',
    default: true,
  },
  SYS_MODULE: {
    key: 'SYS_MODULE',
    description: 'Load and unload kernel modules.',
  },
  SYS_RAWIO: {
    key: 'SYS_RAWIO',
    description: 'Perform I/O port operations (iopl(2) and ioperm(2)).',
  },
  SYS_PACCT: {
    key: 'SYS_PACCT',
    description: 'Use acct(2), switch process accounting on or off.',
  },
  SYS_ADMIN: {
    key: 'SYS_ADMIN',
    description: 'Perform a range of system administration operations.',
  },
  SYS_NICE: {
    key: 'SYS_NICE',
    description:
      'Raise process nice value (nice(2), setpriority(2)) and change the nice value for arbitrary processes.',
  },
  SYS_RESOURCE: {
    key: 'SYS_RESOURCE',
    description: 'Override resource Limits.',
  },
  SYS_TIME: {
    key: 'SYS_TIME',
    description:
      'Set system clock (settimeofday(2), stime(2), adjtimex(2)); set real-time (hardware) clock.',
  },
  SYS_TTY_CONFIG: {
    key: 'SYS_TTY_CONFIG',
    description:
      'Use vhangup(2); employ various privileged ioctl(2) operations on virtual terminals.',
  },
  AUDIT_CONTROL: {
    key: 'AUDIT_CONTROL',
    description:
      'Enable and disable kernel auditing; change auditing filter rules; retrieve auditing status and filtering rules.',
  },
  MAC_ADMIN: {
    key: 'MAC_ADMIN',
    description:
      'Allow MAC configuration or state changes. Implemented for the Smack LSM.',
  },
  MAC_OVERRIDE: {
    key: 'MAC_OVERRIDE',
    description:
      'Override Mandatory Access Control (MAC). Implemented for the Smack Linux Security Module (LSM).',
  },
  NET_ADMIN: {
    key: 'NET_ADMIN',
    description: 'Perform various network-related operations.',
  },
  SYSLOG: {
    key: 'SYSLOG',
    description: 'Perform privileged syslog(2) operations.',
  },
  DAC_READ_SEARCH: {
    key: 'DAC_READ_SEARCH',
    description:
      'Bypass file read permission checks and directory read and execute permission checks.',
  },
  LINUX_IMMUTABLE: {
    key: 'LINUX_IMMUTABLE',
    description: 'Set the FS_APPEND_FL and FS_IMMUTABLE_FL i-node flags.',
  },
  NET_BROADCAST: {
    key: 'NET_BROADCAST',
    description: 'Make socket broadcasts, and listen to multicasts.',
  },
  IPC_LOCK: {
    key: 'IPC_LOCK',
    description: 'Lock memory (mlock(2), mlockall(2), mmap(2), shmctl(2)).',
  },
  IPC_OWNER: {
    key: 'IPC_OWNER',
    description:
      'Bypass permission checks for operations on System V IPC objects.',
  },
  SYS_PTRACE: {
    key: 'SYS_PTRACE',
    description: 'Trace arbitrary processes using ptrace(2).',
  },
  SYS_BOOT: {
    key: 'SYS_BOOT',
    description:
      'Use reboot(2) and kexec_load(2), reboot and load a new kernel for later execution.',
  },
  LEASE: {
    key: 'LEASE',
    description: 'Establish leases on arbitrary files (see fcntl(2)).',
  },
  WAKE_ALARM: {
    key: 'WAKE_ALARM',
    description: 'Trigger something that will wake up the system.',
  },
  BLOCK_SUSPEND: {
    key: 'BLOCK_SUSPEND',
    description: 'Employ features that can block system suspend.',
  },
};

export const capabilities = Object.values(capDesc).sort((a, b) =>
  a.key < b.key ? -1 : 1
);
