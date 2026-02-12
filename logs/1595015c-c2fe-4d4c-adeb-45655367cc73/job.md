Implement proper skill discovery for thepopebot by setting up pi-skills as a git submodule and configuring the necessary paths and dependencies. Specifically:

1. Remove the current `RUN git clone https://github.com/badlogic/pi-skills.git /pi-skills` line from the Dockerfile
2. Add pi-skills as a git submodule at `.pi/skills/pi-skills` (this puts it in Pi's expected discovery path)
3. Update the Dockerfile to:
   - Initialize and update submodules during build
   - Install the required global npm packages for skills that need them (like `npm install -g @mariozechner/gccli`)
4. Update GitHub Actions workflows to handle submodules properly (add `submodules: true` to checkout actions)
5. Test that skills are properly discovered by running a quick Pi command to list available skills
6. Document the new submodule setup in a README or comment

The goal is to have pi-skills properly discoverable by Pi while maintaining a clean git history and easy updates from upstream.