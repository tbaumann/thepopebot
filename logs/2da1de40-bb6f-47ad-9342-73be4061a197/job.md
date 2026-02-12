Test Google Calendar CLI (gccli) setup:

1. Extract GCCLI_CREDS from base64 and tar.gz:
   echo $GCCLI_CREDS | base64 -d | tar xz -C ~

2. Verify the extraction by listing accounts:
   gccli accounts list

3. Report the results - confirm that credentials were extracted correctly and that gccli can access the accounts.