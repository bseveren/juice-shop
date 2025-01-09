FROM mcr.microsoft.com/dotnet/aspnet@sha256:d53ebf3481ea8ac8e4fa5c4213ae1f32a33e68e5b8181868edb11d0496a00432 AS base
ARG IMAGE_TAG=Undefined
# Install chrome while still ROOT
RUN apt-get update && apt-get -f install && apt-get -y install wget gnupg2 apt-utils
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' >> /etc/apt/sources.list
RUN apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends --allow-downgrades fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf
ENV PUPPETEER_EXECUTABLE_PATH "/usr/bin/google-chrome-stable"
USER $APP_UID
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS http://+:8080
ENV IMAGE_TAG=$IMAGE_TAG

FROM mcr.microsoft.com/dotnet/sdk@sha256:f91f9181d68b5ed2c8dea199dbbd2f6d172e60bdc43f8a67878b1ad140cf8d6b AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["two.API/two.API.csproj", "two.API/"]
COPY ["two.PDF/two.PDF.csproj", "two.PDF/"]
COPY ["two.OCR/two.OCR.csproj", "two.OCR/"]
COPY ["two.Shared/two.Shared.csproj", "two.Shared/"]
RUN dotnet restore "two.API/two.API.csproj"
COPY . .
WORKDIR "/src/two.API"
RUN dotnet build "two.API.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "two.API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "two.API.dll"]
