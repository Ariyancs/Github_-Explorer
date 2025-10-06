
const BASE_URL = "https://api.github.com";
// !!! IMPORTANT: Replace this with your GitHub username or app name
const USER_AGENT = "Ariyancs-GitHub-Explorer-App"; 

const FETCH_OPTIONS = {
    headers: {
        'User-Agent': USER_AGENT
    }
};


const userInput = document.getElementById('user-input');
const searchButton = document.getElementById('search-button');
const userProfileCard = document.getElementById('user-profile-card');
const repoListSection = document.getElementById('repo-list-section');
const repoList = document.getElementById('repo-list');
const favoritesList = document.getElementById('favorites-list');
const loadingSpinner = document.getElementById('loading-spinner');
const userResultsSection = document.getElementById('user-results-section');




function toggleLoading(isLoading) {
    if (isLoading) {
        userProfileCard.innerHTML = '';
        repoList.innerHTML = '';
        userResultsSection.classList.add('hidden');
        repoListSection.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

function displayError(message) {
    userProfileCard.innerHTML = `<p class="error" style="color: red;">Error: ${message}</p>`;
    userResultsSection.classList.remove('hidden');
    repoListSection.classList.add('hidden');
}




function getFavorites() {
    const favoritesJSON = localStorage.getItem('githubFavorites');
    return favoritesJSON ? JSON.parse(favoritesJSON) : [];
}


function saveFavorites(favoritesArray) {
    localStorage.setItem('githubFavorites', JSON.stringify(favoritesArray));
    displayFavoritesList(); 
}


function handleFavorites(event) {
    const repoFullName = event.target.dataset.id;
    let favorites = getFavorites();

    if (favorites.includes(repoFullName)) {
        // REMOVE
        favorites = favorites.filter(id => id !== repoFullName);
        event.target.textContent = 'Add Favorite';
        event.target.classList.remove('favorite');
    } else {
        // ADD
        favorites.push(repoFullName);
        event.target.textContent = 'Unfavorite';
        event.target.classList.add('favorite');
    }

    saveFavorites(favorites);
}


function displayUserProfile(user) {
    userResultsSection.classList.remove('hidden');
    
    
    const bio = user.bio || 'No bio available.';
    const location = user.location || 'Unknown location.';
    
    const favorites = getFavorites();
    const isFavorite = favorites.includes(user.login);
    const favButtonText = isFavorite ? 'Unfavorite User' : 'Favorite User';
    const favButtonClass = isFavorite ? 'favorite' : '';

    userProfileCard.innerHTML = `
        <img src="${user.avatar_url}" alt="${user.login} avatar">
        <div class="user-info">
            <h3>${user.name || user.login} (${user.login})</h3>
            <p>${bio}</p>
            <p>📍 ${location}</p>
            <p>Followers: ${user.followers} | Following: ${user.following}</p>
            <p>Public Repos: ${user.public_repos}</p>
            <button 
                class="favorite-repo-btn ${favButtonClass}" 
                data-id="${user.login}" 
                data-type="user"
            >
                ${favButtonText}
            </button>
        </div>
    `;
    
    
    userProfileCard.querySelector('.favorite-repo-btn').addEventListener('click', handleFavorites);
}



function displayRepositoryList(repos) {
    repoList.innerHTML = '';
    repoListSection.classList.remove('hidden');
    const favorites = getFavorites();

    repos.forEach(repo => {
        const repoFullName = repo.full_name;
        const isFavorite = favorites.includes(repoFullName);
        const favButtonText = isFavorite ? 'Unfavorite' : 'Add Favorite';
        const favButtonClass = isFavorite ? 'favorite' : '';

        const listItem = document.createElement('div');
        listItem.className = 'repo-item';
        
        listItem.innerHTML = `
            <h4><a href="${repo.html_url}" target="_blank">${repo.name}</a></h4>
            <p>${repo.description || 'No description provided.'}</p>
            <p> ${repo.stargazers_count} | Language: ${repo.language || 'N/A'}</p>
            <button 
                class="favorite-repo-btn ${favButtonClass}" 
                data-id="${repoFullName}"
                data-type="repo"
            >
                ${favButtonText}
            </button>
        `;
        repoList.appendChild(listItem);
        
        // Add listener to the favorite button
        listItem.querySelector('.favorite-repo-btn').addEventListener('click', handleFavorites);
    });
}


function displayFavoritesList() {
    const favorites = getFavorites();
    favoritesList.innerHTML = '';

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p>No favorites saved yet.</p>';
        return;
    }
    
    favorites.forEach(item => {
        const listItem = document.createElement('div');
        listItem.className = 'favorite-item';
        listItem.innerHTML = `
            <p>${item} <button class="favorite-repo-btn favorite" data-id="${item}">Remove</button></p>
        `;
        favoritesList.appendChild(listItem);
        
        // Re-attach listener for removal
        listItem.querySelector('.favorite-repo-btn').addEventListener('click', handleFavorites);
    });
}



async function fetchRepositories(username) {
    const url = `${BASE_URL}/users/${username}/repos?sort=updated`;
    
    try {
        const response = await fetch(url, FETCH_OPTIONS);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch repositories. Status: ${response.status}`);
        }
        
        const repos = await response.json();
        
        if (Array.isArray(repos) && repos.length > 0) {
            displayRepositoryList(repos);
        } else {
            repoList.innerHTML = '<p>This user has no public repositories.</p>';
            repoListSection.classList.remove('hidden');
        }
    } catch (error) {
        repoList.innerHTML = `<p class="error" style="color: red;">Error fetching repos: ${error.message}</p>`;
    }
}

async function searchUser(username) {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
        displayError("Please enter a GitHub username.");
        return;
    }
    
    
    const url = `${BASE_URL}/search/users?q=${trimmedUsername}&per_page=1`;
    toggleLoading(true);

    try {
        const response = await fetch(url, FETCH_OPTIONS);

        if (!response.ok) {
            
            if (response.status === 403 || response.status === 429) {
                throw new Error("API Rate Limit Exceeded. Please wait a few minutes or provide an Authentication Token.");
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            
            const userResponse = await fetch(data.items[0].url, FETCH_OPTIONS);
            const user = await userResponse.json();
            
            displayUserProfile(user);
            fetchRepositories(user.login); // Fetch user's repos immediately after showing profile
        } else {
            displayError("GitHub user not found.");
        }
    } catch (error) {
        displayError(`GitHub API Error: ${error.message}`);
    } finally {
        toggleLoading(false);
    }
}




searchButton.addEventListener('click', () => {
    searchUser(userInput.value);
});

userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchButton.click();
    }
});

// Load favorites when the page loads
document.addEventListener('DOMContentLoaded', displayFavoritesList);
